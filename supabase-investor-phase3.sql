-- ═══════════════════════════════════════════════════════════════════════════
--  VaultSpark Studios — Investor Area Phase 3: Auto Vault Member Creation
--  Run in: Supabase Dashboard → SQL Editor
--  Depends on: supabase-investor-phase1.sql, supabase-investor-phase2.sql
--
--  Replaces admin_upsert_investor with an updated version that accepts an
--  optional p_create_member flag. When true, it automatically creates a
--  vault_members record for the investor (bypassing invite code requirements)
--  and awards them the Investor achievement badge.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── Helper: generate a unique vault username from display_name ────────────────

create or replace function public.generate_investor_username(p_display_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base    text;
  v_attempt text;
  v_n       integer := 0;
begin
  v_base := lower(regexp_replace(trim(p_display_name), '[^a-z0-9]+', '_', 'gi'));
  v_base := trim(both '_' from v_base);
  v_base := left(v_base, 28);

  loop
    v_attempt := case when v_n = 0 then v_base else v_base || '_' || v_n end;
    exit when not exists (
      select 1 from vault_members where username_lower = v_attempt
    );
    v_n := v_n + 1;
    if v_n > 99 then
      v_attempt := v_base || '_' || floor(random() * 9000 + 1000)::int;
      exit;
    end if;
  end loop;

  return v_attempt;
end;
$$;


-- ── Updated admin_upsert_investor ─────────────────────────────────────────────
-- Adds p_create_member boolean. When true and this is a new investor (not an
-- update), creates a vault_members row with:
--   - Username derived from display_name (unique, slugified)
--   - 500 starting points (Forge Guard level — a meaningful head start)
--   - achievements: ['joined', 'investor']
--   - subscribed: true

drop function if exists public.admin_upsert_investor(text, text, text, text, numeric, numeric, date, text, uuid);

create or replace function public.admin_upsert_investor(
  p_email             text,
  p_display_name      text,
  p_entity_type       text    default 'individual',
  p_tier              text    default 'standard',
  p_investment_amount numeric default null,
  p_equity_percentage numeric default null,
  p_investment_date   date    default null,
  p_notes             text    default null,
  p_investor_id       uuid    default null,  -- if set: update existing
  p_create_member     boolean default false  -- if true: also create vault member
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_user_id     uuid;
  v_investor_id uuid := p_investor_id;
  v_username    text;
  v_action      text;
  v_member_created boolean := false;
begin
  -- Guard: admin only
  if not exists (
    select 1 from vault_members where id = v_uid and username_lower = 'vaultspark'
  ) then
    return jsonb_build_object('error', 'Unauthorized');
  end if;

  -- Look up auth user by email
  select id into v_user_id from auth.users where email = lower(trim(p_email));
  if not found then
    return jsonb_build_object(
      'error', 'No auth account found for that email. The investor must create an account at /investor/login/ first.'
    );
  end if;

  if v_investor_id is not null then
    -- ── Update existing investor ──────────────────────────────────────────
    update investors set
      display_name      = p_display_name,
      entity_type       = p_entity_type,
      tier              = p_tier,
      investment_amount = p_investment_amount,
      equity_percentage = p_equity_percentage,
      investment_date   = p_investment_date,
      notes             = p_notes,
      updated_at        = now()
    where id = v_investor_id;

    v_action := 'updated';

  else
    -- ── Insert new investor ───────────────────────────────────────────────
    insert into investors (
      user_id, display_name, entity_type, tier,
      investment_amount, equity_percentage, investment_date,
      notes, created_by
    ) values (
      v_user_id, p_display_name, p_entity_type, p_tier,
      p_investment_amount, p_equity_percentage, p_investment_date,
      p_notes, v_uid
    )
    on conflict (user_id) do update set
      display_name      = excluded.display_name,
      entity_type       = excluded.entity_type,
      tier              = excluded.tier,
      investment_amount = excluded.investment_amount,
      equity_percentage = excluded.equity_percentage,
      investment_date   = excluded.investment_date,
      notes             = excluded.notes,
      updated_at        = now()
    returning id into v_investor_id;

    v_action := 'created';

    -- ── Optionally create Vault Member account ────────────────────────────
    if p_create_member and v_action = 'created' then
      -- Only create if they don't already have a vault_members row
      if not exists (select 1 from vault_members where id = v_user_id) then

        v_username := public.generate_investor_username(p_display_name);

        insert into vault_members (
          id,
          username,
          username_lower,
          invite_code,
          points,
          subscribed,
          achievements
        ) values (
          v_user_id,
          -- Capitalise first letter of each word for display username
          initcap(replace(v_username, '_', ' ')) || '',
          v_username,
          'INVESTOR-AUTO',  -- placeholder code for audit trail
          500,              -- Forge Guard starting point (rank 2)
          true,
          jsonb_build_array(
            jsonb_build_object('id', 'joined',    'earned', now()),
            jsonb_build_object('id', 'investor',  'earned', now()),
            jsonb_build_object('id', 'subscribed','earned', now())
          )
        );

        -- Also log a point_event so the activity feed shows the grant
        insert into point_events (user_id, points, reason, created_at)
        values (v_user_id, 500, 'investor_onboarding', now())
        on conflict do nothing;

        v_member_created := true;
      end if;
    end if;

  end if;

  return jsonb_build_object(
    'ok',             true,
    'action',         v_action,
    'investor_id',    v_investor_id,
    'member_created', v_member_created,
    'username',       case when v_member_created then v_username else null end
  );
end;
$$;

grant execute on function public.admin_upsert_investor(text, text, text, text, numeric, numeric, date, text, uuid, boolean) to authenticated;
grant execute on function public.generate_investor_username(text) to authenticated;
