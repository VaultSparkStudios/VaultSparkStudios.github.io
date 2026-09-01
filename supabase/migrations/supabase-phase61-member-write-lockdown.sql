-- ══════════════════════════════════════════════════════════════════════
-- Phase 61 — Member write lockdown (S335)
-- ══════════════════════════════════════════════════════════════════════
-- Finding: the base schema's "update own member record" policy grants an
-- authenticated member UPDATE on EVERY column of their own row, with no
-- WITH CHECK. The browser therefore held a direct write on points,
-- plan_key, is_sparked, season_xp and achievements — which meant a member
-- could forge rank, leaderboard position, treasury balance, and the paid
-- AI tier (ask-ignis reads member.is_sparked / plan_key for entitlement).
--
-- This migration:
--   1. Recreates the policy with an explicit WITH CHECK.
--   2. Revokes table-wide UPDATE and re-grants it column by column, only
--      for profile/preference columns. Progression and entitlement
--      columns can only move through security-definer RPCs.
--   3. Adds gift_points(): the only path for member-to-member point
--      transfer. Atomic, bounds-checked, self-gift rejected, caller
--      resolved from auth.uid() — never from a parameter.
--   4. Hardens purchase_treasury_item(): it accepted a caller-supplied
--      user id; it now uses auth.uid() and ignores p_user_id unless it
--      matches the caller.
--   5. Adds public_leaderboard: a definer view that honours the
--      public_profile opt-out so public surfaces stop bypassing it.
--
-- Idempotent — every statement is guarded and safe to re-run.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Policy with WITH CHECK ─────────────────────────────────────────
-- The live policy is named "members: update own row" (dashboard-created),
-- the migration file says "update own member record". Policies are
-- permissive-OR, so a stale one would silently keep the wide grant alive:
-- drop EVERY update policy on the table by lookup, then create exactly one.
do $$
declare p record;
begin
  for p in
    select pol.polname from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'vault_members' and pol.polcmd = 'w'
  loop
    execute format('drop policy %I on public.vault_members', p.polname);
  end loop;
end $$;
create policy "update own member record" on public.vault_members
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── 2. Column-scoped UPDATE grant ─────────────────────────────────────
-- Live grants were the Supabase defaults: anon and authenticated held
-- SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on the table.
-- RLS made most of that inert, but grants are defence-in-depth and column
-- UPDATE grants are the only thing that can stop a member editing their
-- own progression. No client path inserts or deletes on vault_members
-- (registration goes through register_with_invite, a security-definer
-- function; edge functions use service_role), so those are revoked too.
-- Columns added via the dashboard may not exist on every environment, so
-- the grant is defensive: only columns that actually exist are granted.
revoke insert, update, delete, truncate, references, trigger on public.vault_members from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.vault_members from anon;

do $$
declare
  c text;
  profile_columns text[] := array[
    'subscribed', 'prefs', 'public_profile',
    'bio', 'avatar_id', 'avatar_emoji', 'accent', 'rank_name',
    'onboarding_completed', 'delete_requested',
    'streak_count', 'last_login_date',
    'challenge_streak', 'last_challenge_date',
    'last_monthly_xp_at', 'enrolled_phase'
  ];
begin
  foreach c in array profile_columns loop
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'vault_members' and column_name = c
    ) then
      execute format('grant update (%I) on public.vault_members to authenticated', c);
    end if;
  end loop;
end $$;
-- Deliberately NOT granted: points, is_sparked, plan_key, season_xp,
-- current_season_id, achievements, member_number, referred_by, invite_code,
-- discord_id (save_discord_id RPC), stripe_price_id, username,
-- username_lower, created_at, id.

-- ── 3. gift_points RPC ────────────────────────────────────────────────
create or replace function public.gift_points(p_recipient_username text, p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender      uuid := auth.uid();
  v_sender_name text;
  v_recip_id    uuid;
  v_recip_name  text;
  v_balance     integer;
begin
  if v_sender is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_amount is null or p_amount < 10 or p_amount > 500 then
    return jsonb_build_object('ok', false, 'error', 'amount_out_of_range');
  end if;

  -- username_lower is not populated on every row (dashboard-created members),
  -- so match on the canonical lower(username) as well.
  select id, username into v_recip_id, v_recip_name
    from vault_members
   where lower(username) = lower(trim(coalesce(p_recipient_username, '')))
      or username_lower = lower(trim(coalesce(p_recipient_username, '')))
   limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'recipient_not_found');
  end if;
  if v_recip_id = v_sender then
    return jsonb_build_object('ok', false, 'error', 'self_gift');
  end if;

  -- Lock the sender row so two concurrent gifts cannot double-spend.
  select points, username into v_balance, v_sender_name
    from vault_members where id = v_sender for update;
  if v_balance is null then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;
  if v_balance < p_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient_points');
  end if;

  update vault_members set points = points - p_amount where id = v_sender;
  update vault_members set points = points + p_amount where id = v_recip_id;

  insert into point_events (user_id, reason, label, points) values
    (v_sender,   'gift_sent',     'Gift to ' || v_recip_name,    -p_amount),
    (v_recip_id, 'gift_received', 'Gift from ' || v_sender_name,  p_amount);

  return jsonb_build_object(
    'ok', true,
    'recipient', v_recip_name,
    'amount', p_amount,
    'balance', v_balance - p_amount
  );
end;
$$;

-- Supabase default privileges grant EXECUTE on new functions to anon as well
-- as authenticated, so the anon revoke must be explicit.
revoke all on function public.gift_points(text, integer) from public;
revoke execute on function public.gift_points(text, integer) from anon;
grant execute on function public.gift_points(text, integer) to authenticated;

-- ── 4. purchase_treasury_item: caller from auth.uid() ─────────────────
-- Same signature so existing callers keep working; p_user_id is now only
-- accepted when it equals the authenticated caller.
create or replace function public.purchase_treasury_item(p_user_id uuid, p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller  uuid := auth.uid();
  v_item    treasury_items;
  v_balance integer;
begin
  if v_caller is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if p_user_id is not null and p_user_id <> v_caller then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_item from treasury_items where id = p_item_id and is_active = true;
  if not found then return jsonb_build_object('ok', false, 'error', 'item_not_found'); end if;

  select points into v_balance from vault_members where id = v_caller for update;
  if v_balance is null then return jsonb_build_object('ok', false, 'error', 'member_not_found'); end if;
  if v_balance < v_item.cost then return jsonb_build_object('ok', false, 'error', 'insufficient_points'); end if;

  if exists (select 1 from treasury_purchases where user_id = v_caller and item_id = p_item_id) then
    return jsonb_build_object('ok', false, 'error', 'already_owned');
  end if;

  update vault_members set points = points - v_item.cost where id = v_caller;
  insert into treasury_purchases (user_id, item_id, cost) values (v_caller, p_item_id, v_item.cost);
  insert into point_events (user_id, points, label, reason)
    values (v_caller, -v_item.cost, 'Treasury: ' || v_item.name, 'treasury_purchase');

  return jsonb_build_object('ok', true, 'item', v_item.name, 'cost', v_item.cost);
end;
$$;

-- ── 5. public_leaderboard view (honours the opt-out) ──────────────────
-- security_invoker = false: the view runs as its owner, so anon can read
-- exactly the projected columns of opted-in members and nothing else.
-- The base-table anon SELECT is intentionally left alone: /community/
-- counts new members across all rows and several embeds join on it.
-- Live finding (S335 probe): the base table has NO anon read policy — only
-- "read own row" — so every anonymous public surface (member counts,
-- recently joined, leaderboards, directory, public profiles) has been
-- rendering empty. This view is therefore the public projection of the
-- members table, not just the leaderboard. Columns added through the
-- dashboard (avatar_emoji, accent, rank_name) are included only when they
-- exist, so the migration is portable across environments.
do $$
declare
  wanted  text[] := array['id','username','points','created_at','member_number','is_sparked','avatar_emoji','accent','rank_name'];
  cols    text[] := array[]::text[];
  c       text;
begin
  foreach c in array wanted loop
    if exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'vault_members' and column_name = c) then
      cols := cols || quote_ident(c);
    end if;
  end loop;
  execute 'drop view if exists public.public_leaderboard';
  execute format(
    'create view public.public_leaderboard with (security_invoker = false) as select %s from public.vault_members where public_profile = true',
    array_to_string(cols, ', ')
  );
end $$;

grant select on public.public_leaderboard to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Verification (run as a member, e.g. via scripts/apply-supabase-migration.mjs --probe member-write-lockdown):
--   update vault_members set points = 999999 where id = auth.uid();
--     → ERROR 42501 permission denied for table vault_members
--   update vault_members set prefs = prefs where id = auth.uid();
--     → UPDATE 1
--   select gift_points('<own username>', 50);   → {"ok":false,"error":"self_gift"}
--   select gift_points('someone', 5);           → {"ok":false,"error":"amount_out_of_range"}
--   select count(*) from public_leaderboard;    → only public_profile = true rows
-- ══════════════════════════════════════════════════════════════════════
