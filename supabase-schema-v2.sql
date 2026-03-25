-- ═══════════════════════════════════════════════════════════════
--  VaultSpark Studios — Supabase Schema v2
--  Run AFTER supabase-schema.sql in the Supabase SQL Editor.
--  Adds: cross-device sync, vault events, subscriptions, game sessions,
--        award_vault_points RPC, achievement triggers.
-- ═══════════════════════════════════════════════════════════════

-- ── promogrind_data — cross-device ledger + tracker sync ────────
create table public.promogrind_data (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete cascade unique not null,
  ledger     jsonb       default '[]'::jsonb,
  tracker    jsonb       default '[]'::jsonb,
  updated_at timestamptz default now()
);
alter table public.promogrind_data enable row level security;
create policy "users manage own promogrind data" on public.promogrind_data
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── vault_events — activity tracking for points + achievements ──
create table public.vault_events (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  event_type text        not null,  -- 'calculation','ledger_entry','login','game_session', etc.
  points     integer     default 0,
  metadata   jsonb       default '{}'::jsonb,
  created_at timestamptz default now()
);
alter table public.vault_events enable row level security;
create policy "users insert own events" on public.vault_events
  for insert with check (auth.uid() = user_id);
create policy "users read own events" on public.vault_events
  for select using (auth.uid() = user_id);

-- ── subscriptions — paid tier ───────────────────────────────────
create table public.subscriptions (
  id                      uuid        default gen_random_uuid() primary key,
  user_id                 uuid        references auth.users(id) on delete cascade unique not null,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan                    text        default 'free',      -- 'free' | 'pro'
  status                  text        default 'inactive',  -- 'active' | 'inactive' | 'canceled' | 'past_due'
  current_period_end      timestamptz,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);
alter table public.subscriptions enable row level security;
-- Members read their own subscription; only service role (stripe-webhook fn) writes
create policy "users read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- ── game_sessions — future game stat integration ─────────────────
create table public.game_sessions (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  game_slug  text        not null,   -- 'call-of-doodie', 'gridiron-gm', etc.
  score      integer,
  duration_s integer,                -- session length in seconds
  metadata   jsonb       default '{}'::jsonb,
  played_at  timestamptz default now()
);
alter table public.game_sessions enable row level security;
create policy "users read own game sessions" on public.game_sessions
  for select using (auth.uid() = user_id);
-- Games write via service role key from their own backends

-- ── achievement definitions view ────────────────────────────────
-- Supplements the JS-side ACHIEVEMENT_DEFS array with server-side unlock logic.
-- 'joined', 'subscribed' are set at registration by register_with_invite RPC.
-- All others are unlocked by award_vault_points below.

-- ── RPC: award_vault_points ─────────────────────────────────────
-- Called from client after meaningful actions (calculation, ledger entry, etc.)
-- Inserts a vault_event, increments vault_members.points, checks achievements.

create or replace function public.award_vault_points(
  p_user_id    uuid,
  p_event_type text,
  p_points     integer,
  p_metadata   jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total        integer;
  v_calc_count   bigint;
  v_ledger_count bigint;
  v_login_count  bigint;
  v_new_ach      jsonb := '[]'::jsonb;
begin
  -- Guard: user must exist in vault_members
  if not exists (select 1 from public.vault_members where id = p_user_id) then
    return jsonb_build_object('error', 'Member not found');
  end if;

  -- Insert event
  insert into public.vault_events (user_id, event_type, points, metadata)
  values (p_user_id, p_event_type, p_points, p_metadata);

  -- Update points
  update public.vault_members
  set points = points + p_points
  where id = p_user_id
  returning points into v_total;

  -- ── Achievement checks ─────────────────────────────────────────

  -- first_100: reach 100 vault points
  if v_total >= 100 then
    update public.vault_members
    set achievements = achievements || '[{"id":"first_100"}]'::jsonb
    where id = p_user_id
      and not (achievements @> '[{"id":"first_100"}]'::jsonb);
    if found then v_new_ach := v_new_ach || '[{"id":"first_100"}]'; end if;
  end if;

  -- promo_first: first calculator use
  select count(*) into v_calc_count
  from public.vault_events
  where user_id = p_user_id and event_type = 'calculation';

  if v_calc_count >= 1 then
    update public.vault_members
    set achievements = achievements || '[{"id":"promo_first"}]'::jsonb
    where id = p_user_id
      and not (achievements @> '[{"id":"promo_first"}]'::jsonb);
    if found then v_new_ach := v_new_ach || '[{"id":"promo_first"}]'; end if;
  end if;

  -- promo_10: 10 calculations
  if v_calc_count >= 10 then
    update public.vault_members
    set achievements = achievements || '[{"id":"promo_10"}]'::jsonb
    where id = p_user_id
      and not (achievements @> '[{"id":"promo_10"}]'::jsonb);
    if found then v_new_ach := v_new_ach || '[{"id":"promo_10"}]'; end if;
  end if;

  -- ledger_first: first ledger entry
  select count(*) into v_ledger_count
  from public.vault_events
  where user_id = p_user_id and event_type = 'ledger_entry';

  if v_ledger_count >= 1 then
    update public.vault_members
    set achievements = achievements || '[{"id":"ledger_first"}]'::jsonb
    where id = p_user_id
      and not (achievements @> '[{"id":"ledger_first"}]'::jsonb);
    if found then v_new_ach := v_new_ach || '[{"id":"ledger_first"}]'; end if;
  end if;

  -- ledger_50: 50 ledger entries
  if v_ledger_count >= 50 then
    update public.vault_members
    set achievements = achievements || '[{"id":"ledger_50"}]'::jsonb
    where id = p_user_id
      and not (achievements @> '[{"id":"ledger_50"}]'::jsonb);
    if found then v_new_ach := v_new_ach || '[{"id":"ledger_50"}]'; end if;
  end if;

  return jsonb_build_object('success', true, 'total_points', v_total, 'new_achievements', v_new_ach);
end;
$$;

-- ── RPC: get_member_stats ───────────────────────────────────────
-- Returns enriched member data including stats from related tables.
-- Used by vault-member dashboard to show real numbers.

create or replace function public.get_member_stats(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member      public.vault_members%rowtype;
  v_calc_count  bigint;
  v_ledger_count bigint;
  v_sub_status  text := 'inactive';
  v_game_count  bigint;
begin
  select * into v_member from public.vault_members where id = p_user_id;
  if not found then return jsonb_build_object('error', 'Not found'); end if;

  select count(*) into v_calc_count
  from public.vault_events where user_id = p_user_id and event_type = 'calculation';

  select count(*) into v_ledger_count
  from public.vault_events where user_id = p_user_id and event_type = 'ledger_entry';

  select status into v_sub_status
  from public.subscriptions where user_id = p_user_id;

  select count(distinct game_slug) into v_game_count
  from public.game_sessions where user_id = p_user_id;

  return jsonb_build_object(
    'points',          v_member.points,
    'achievements',    v_member.achievements,
    'calc_count',      v_calc_count,
    'ledger_count',    v_ledger_count,
    'sub_status',      coalesce(v_sub_status, 'inactive'),
    'game_count',      v_game_count,
    'created_at',      v_member.created_at
  );
end;
$$;
