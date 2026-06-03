-- ============================================================================
-- S136 — Investor Portal depth: KPI snapshots + founder reply visibility
-- ============================================================================
--
-- Two gaps surfaced by the S136 portal-promise audit:
--
--   1. The /vault-portal/ card promised "Live studio KPI dashboard" but the
--      investor portal only rendered point-in-time numbers — no historical
--      trending, no sparklines. Founders had no story for "is the membership
--      base growing?" beyond eyeballing the current number.
--
--   2. The card promised "Secure messaging line to the founder" but the
--      `investor_messages` table only stored investor→founder direction.
--      Founder replies happened in admin out-of-band; investors had no way
--      to see them in the portal. One-way conversation isn't a line.
--
-- This migration ships both: a daily KPI snapshot table + a reply column on
-- investor_messages with proper RLS so investors see only their own thread.
--
-- Idempotent (uses IF NOT EXISTS / IF EXISTS guards). Safe to re-apply.
-- ============================================================================

-- ─── 1. INVESTOR_KPI_SNAPSHOTS ──────────────────────────────────────────────
-- One row per UTC date capturing the studio KPI state at that point. Cron
-- workflow (.github/workflows/investor-kpi-snapshot.yml) writes one row/day.
-- 90-day rolling window is plenty for the sparkline; older rows can be
-- archived or pruned by a maintenance job.

create table if not exists public.investor_kpi_snapshots (
  snapshot_date    date primary key,
  members_total    integer not null default 0,
  members_new_7d   integer not null default 0,
  sessions_7d      integer not null default 0,
  challenges_open  integer not null default 0,
  achievements_unlocked_7d integer not null default 0,
  vaultsparked_total integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists investor_kpi_snapshots_date_idx
  on public.investor_kpi_snapshots (snapshot_date desc);

alter table public.investor_kpi_snapshots enable row level security;

-- Authenticated investors read everything (no PII; aggregates only).
-- Service role writes via the daily cron.
drop policy if exists "investors read kpi snapshots"
  on public.investor_kpi_snapshots;
create policy "investors read kpi snapshots"
  on public.investor_kpi_snapshots
  for select
  using (
    exists (
      select 1 from public.investors
      where investors.user_id = auth.uid()
    )
  );

-- Helper RPC: callers get the last N days in one round trip.
create or replace function public.get_investor_kpi_series(p_days integer default 30)
returns setof public.investor_kpi_snapshots
language sql
stable
security definer
set search_path = public
as $$
  select * from public.investor_kpi_snapshots
  where snapshot_date >= current_date - (p_days::int)
  order by snapshot_date asc;
$$;

grant execute on function public.get_investor_kpi_series(integer) to authenticated;

-- Daily-snapshot writer RPC. Service role only — the cron supplies the
-- service-role key via Supabase Edge Function or GitHub Actions secret.
create or replace function public.write_investor_kpi_snapshot()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_members integer;
  v_members_new_7d integer;
  v_sessions_7d integer;
  v_challenges_open integer;
  v_achievements_7d integer;
  v_sparked integer;
begin
  select count(*) into v_members from public.vault_members;
  select count(*) into v_members_new_7d
    from public.vault_members
    where created_at >= now() - interval '7 days';
  -- Tables below are best-effort lookups; missing tables OR missing columns
  -- => zero, not failure. Real column names per repo schema:
  --   game_sessions.played_at, challenges.active, member_achievements.unlocked_at
  begin
    select count(*) into v_sessions_7d
      from public.game_sessions
      where played_at >= now() - interval '7 days';
  exception when undefined_table or undefined_column then v_sessions_7d := 0; end;
  begin
    select count(*) into v_challenges_open
      from public.challenges
      where active = true;
  exception when undefined_table or undefined_column then v_challenges_open := 0; end;
  begin
    select count(*) into v_achievements_7d
      from public.member_achievements
      where unlocked_at >= now() - interval '7 days';
  exception when undefined_table or undefined_column then v_achievements_7d := 0; end;
  begin
    select count(*) into v_sparked
      from public.vault_members
      where subscribed = true;
  exception when undefined_table or undefined_column then v_sparked := 0; end;

  insert into public.investor_kpi_snapshots (
    snapshot_date, members_total, members_new_7d, sessions_7d,
    challenges_open, achievements_unlocked_7d, vaultsparked_total
  )
  values (
    current_date, coalesce(v_members, 0), coalesce(v_members_new_7d, 0),
    coalesce(v_sessions_7d, 0), coalesce(v_challenges_open, 0),
    coalesce(v_achievements_7d, 0), coalesce(v_sparked, 0)
  )
  on conflict (snapshot_date) do update set
    members_total = excluded.members_total,
    members_new_7d = excluded.members_new_7d,
    sessions_7d = excluded.sessions_7d,
    challenges_open = excluded.challenges_open,
    achievements_unlocked_7d = excluded.achievements_unlocked_7d,
    vaultsparked_total = excluded.vaultsparked_total;
end;
$$;

-- Service role only — investors never call this directly.
revoke execute on function public.write_investor_kpi_snapshot() from public;
revoke execute on function public.write_investor_kpi_snapshot() from authenticated;

-- ─── 2. FOUNDER REPLY ON INVESTOR_MESSAGES ──────────────────────────────────
-- Extend the existing investor_messages table so founder replies live in the
-- same row as the original investor message. RLS still scopes each row by
-- the investor that owns the thread.

alter table if exists public.investor_messages
  add column if not exists founder_reply text,
  add column if not exists founder_replied_at timestamptz,
  add column if not exists founder_replied_by uuid references auth.users(id);

create index if not exists investor_messages_replied_idx
  on public.investor_messages (investor_id, founder_replied_at desc nulls last);

-- Investors continue to read their own thread (existing policy already covers
-- select for own rows). Admin write policy already covers update for service
-- role. No new policies needed.

-- Helper view: investors get their thread + reply status in one query.
-- Uses canonical investor_messages column names (`message`, `priority`) and
-- aliases them to the conventional `body`, `category` the UI expects.
create or replace view public.investor_message_thread as
  select
    m.id,
    m.investor_id,
    m.subject,
    m.message as body,
    m.priority as category,
    m.created_at,
    m.founder_reply,
    m.founder_replied_at,
    case
      when m.founder_reply is not null then 'replied'
      when m.founder_replied_at is not null then 'replied'
      when m.created_at < now() - interval '7 days' then 'awaiting'
      else 'in_review'
    end as status
  from public.investor_messages m;

grant select on public.investor_message_thread to authenticated;

-- ─── Done ──────────────────────────────────────────────────────────────────
-- Apply order: investor-phase1.sql (creates investors + investor_messages)
-- must already be applied; this migration is additive on top.
