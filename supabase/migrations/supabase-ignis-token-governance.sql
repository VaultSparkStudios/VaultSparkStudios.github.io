-- IGNIS Token Governance (P0)
--
-- Three tables that bound and observe AI spend across all IGNIS edge functions:
--   1. ignis_daily_meter   — per-function daily token + USD ledger; enforces hard caps.
--   2. ignis_user_memory   — per-user 30-day rolling memory for conversational continuity.
--   3. ignis_alerts        — append-only audit log of cap breaches + kill-switch events.
--
-- Authoritative cap source: ignis_function_caps. A row exists per function name; the
-- token-meter shared lib reads cap_usd_daily and rejects calls past the threshold.
-- The IGNIS_GLOBAL_PAUSE env var (read by every function) is the kill switch and
-- bypasses the DB entirely so it works even if Supabase is down.
--
-- Pricing (claude-sonnet-4-6, 2026-04-27): $3/M input, $15/M output. With 90% prompt
-- cache hit rate the effective input cost is ~$0.30/M. Caps below assume that.

-- ─── 1. ignis_daily_meter ────────────────────────────────────────────────────
-- Append-mode counter per (date, function_name). Every Anthropic response increments
-- this row. usd_estimate is computed at write time so we never recompute pricing.
create table if not exists ignis_daily_meter (
  meter_date     date        not null,
  function_name  text        not null,
  input_tokens   bigint      not null default 0,
  output_tokens  bigint      not null default 0,
  cache_read_tokens bigint   not null default 0,
  cache_create_tokens bigint not null default 0,
  call_count     integer     not null default 0,
  usd_estimate   numeric(10,4) not null default 0,
  updated_at     timestamptz not null default now(),
  primary key (meter_date, function_name)
);

create index if not exists ignis_daily_meter_date_idx
  on ignis_daily_meter (meter_date desc);

alter table ignis_daily_meter enable row level security;

create policy "service_role_full_meter"
  on ignis_daily_meter for all
  using (auth.role() = 'service_role');

-- Read access for the founder admin dashboard. The /admin/ surface is gated at the
-- Worker edge already (PORTAL_GATE_ENABLED), so RLS just gates direct table reads.
create policy "anon_no_read_meter"
  on ignis_daily_meter for select
  using (false);

-- ─── 2. ignis_function_caps ──────────────────────────────────────────────────
-- Authoritative daily cap per function. Seeded with conservative values; the founder
-- can edit these from /admin/ignis-spend or by raw SQL.
create table if not exists ignis_function_caps (
  function_name      text primary key,
  cap_usd_daily      numeric(10,4) not null default 1.00,
  alert_pct          smallint not null default 70 check (alert_pct between 50 and 95),
  enabled            boolean not null default true,
  notes              text,
  updated_at         timestamptz not null default now()
);

alter table ignis_function_caps enable row level security;

create policy "service_role_full_caps"
  on ignis_function_caps for all
  using (auth.role() = 'service_role');

insert into ignis_function_caps (function_name, cap_usd_daily, alert_pct, notes) values
  ('ask-ignis',                   2.00, 70, 'Per-page adaptive lens + base oracle. Layer 2 hard cap.'),
  ('semantic-search',             2.50, 70, 'Cmd+K AI synthesis layer. Highest-curiosity surface.'),
  ('generate-vault-narrative',    0.10, 70, 'Daily cron — one call per 24h ceiling.'),
  ('onboarding-interview',        1.50, 70, 'Membership interview flow. ~25 signups before fallback.'),
  ('eternal-intelligence',        0.50, 70, 'Eternal-tier intelligence calls. Tight budget.'),
  ('feedback-aggregate',          0.05, 70, 'Weekly summarizer of micro-feedback.')
on conflict (function_name) do nothing;

-- ─── 3. ignis_user_memory (P10 dependency) ───────────────────────────────────
-- Stores last 3 conversation summaries per user, 30-day TTL. Enables
-- IGNIS to remember "you asked about MindFrame last week" without re-reading
-- the full prior conversation.
create table if not exists ignis_user_memory (
  user_id          uuid not null,
  memory_slot      smallint not null check (memory_slot between 1 and 3),
  summary          text not null,
  context_tags     text[],
  last_referenced  timestamptz not null default now(),
  expires_at       timestamptz not null default (now() + interval '30 days'),
  primary key (user_id, memory_slot)
);

create index if not exists ignis_user_memory_user_idx
  on ignis_user_memory (user_id, last_referenced desc);

alter table ignis_user_memory enable row level security;

create policy "user_read_own_memory"
  on ignis_user_memory for select
  using (auth.uid() = user_id);

create policy "service_role_full_memory"
  on ignis_user_memory for all
  using (auth.role() = 'service_role');

-- ─── 4. ignis_alerts ─────────────────────────────────────────────────────────
-- Append-only audit log. Founder reads this in the brief SIGNALS block and the
-- /admin/ignis-spend dashboard.
create table if not exists ignis_alerts (
  id           bigserial primary key,
  alert_type   text        not null check (alert_type in ('cap_70','cap_100','kill_switch','manual_pause','manual_resume')),
  function_name text,
  detail       text,
  usd_at_alert numeric(10,4),
  created_at   timestamptz not null default now()
);

create index if not exists ignis_alerts_recent_idx
  on ignis_alerts (created_at desc);

alter table ignis_alerts enable row level security;

create policy "service_role_full_alerts"
  on ignis_alerts for all
  using (auth.role() = 'service_role');

-- ─── 5. RPC: increment_ignis_meter ───────────────────────────────────────────
-- Atomic upsert + cap check. Returns row with effective spend after increment and
-- a `would_breach` flag the function uses to short-circuit before the next call.
create or replace function increment_ignis_meter(
  p_function_name  text,
  p_input_tokens   bigint,
  p_output_tokens  bigint,
  p_cache_read     bigint default 0,
  p_cache_create   bigint default 0
) returns table (
  total_usd      numeric,
  cap_usd        numeric,
  pct_of_cap     numeric,
  would_breach   boolean,
  was_first_70   boolean
)
language plpgsql security definer as $$
declare
  v_input_cost     numeric;
  v_output_cost    numeric;
  v_call_cost      numeric;
  v_today          date := (now() at time zone 'utc')::date;
  v_prev_usd       numeric;
  v_new_usd        numeric;
  v_cap            numeric;
  v_alert_pct      smallint;
  v_was_first_70   boolean := false;
begin
  -- Pricing constants (Sonnet 4.6, 2026-04). Update here when models change.
  -- Input: $3/M, output: $15/M, cache_read: $0.30/M (10× cheaper), cache_create: $3.75/M.
  v_input_cost   := (p_input_tokens   * 3.00)  / 1000000.0;
  v_output_cost  := (p_output_tokens  * 15.00) / 1000000.0;
  v_call_cost    := v_input_cost + v_output_cost
                  + ((p_cache_read   * 0.30)   / 1000000.0)
                  + ((p_cache_create * 3.75)   / 1000000.0);

  select cap_usd_daily, alert_pct into v_cap, v_alert_pct
    from ignis_function_caps where function_name = p_function_name;
  if v_cap is null then v_cap := 1.00; v_alert_pct := 70; end if;

  select usd_estimate into v_prev_usd
    from ignis_daily_meter
    where meter_date = v_today and function_name = p_function_name;
  if v_prev_usd is null then v_prev_usd := 0; end if;

  v_new_usd := v_prev_usd + v_call_cost;

  insert into ignis_daily_meter
    (meter_date, function_name, input_tokens, output_tokens,
     cache_read_tokens, cache_create_tokens, call_count, usd_estimate, updated_at)
  values
    (v_today, p_function_name, p_input_tokens, p_output_tokens,
     p_cache_read, p_cache_create, 1, v_call_cost, now())
  on conflict (meter_date, function_name) do update set
    input_tokens        = ignis_daily_meter.input_tokens        + excluded.input_tokens,
    output_tokens       = ignis_daily_meter.output_tokens       + excluded.output_tokens,
    cache_read_tokens   = ignis_daily_meter.cache_read_tokens   + excluded.cache_read_tokens,
    cache_create_tokens = ignis_daily_meter.cache_create_tokens + excluded.cache_create_tokens,
    call_count          = ignis_daily_meter.call_count          + 1,
    usd_estimate        = ignis_daily_meter.usd_estimate        + excluded.usd_estimate,
    updated_at          = now();

  if v_prev_usd < (v_cap * v_alert_pct / 100.0)
     and v_new_usd >= (v_cap * v_alert_pct / 100.0) then
    v_was_first_70 := true;
    insert into ignis_alerts (alert_type, function_name, detail, usd_at_alert)
      values ('cap_70', p_function_name,
              'crossed ' || v_alert_pct || '% of $' || v_cap || ' cap',
              v_new_usd);
  end if;

  if v_prev_usd < v_cap and v_new_usd >= v_cap then
    insert into ignis_alerts (alert_type, function_name, detail, usd_at_alert)
      values ('cap_100', p_function_name,
              'breached daily cap of $' || v_cap,
              v_new_usd);
  end if;

  return query select
    v_new_usd as total_usd,
    v_cap as cap_usd,
    round((v_new_usd / nullif(v_cap, 0)) * 100, 2) as pct_of_cap,
    (v_new_usd >= v_cap) as would_breach,
    v_was_first_70 as was_first_70;
end;
$$;

grant execute on function increment_ignis_meter(text, bigint, bigint, bigint, bigint)
  to service_role;

-- ─── 6. View: ignis_spend_today ──────────────────────────────────────────────
-- Convenience view for /admin/ignis-spend dashboard. Joins meter + caps + alert state.
create or replace view ignis_spend_today as
select
  c.function_name,
  c.cap_usd_daily,
  c.alert_pct,
  c.enabled,
  coalesce(m.usd_estimate, 0)            as usd_today,
  coalesce(m.call_count, 0)              as calls_today,
  coalesce(m.input_tokens, 0)            as input_tokens_today,
  coalesce(m.output_tokens, 0)           as output_tokens_today,
  coalesce(m.cache_read_tokens, 0)       as cache_read_tokens_today,
  round(coalesce(m.usd_estimate, 0) / nullif(c.cap_usd_daily, 0) * 100, 2) as pct_of_cap,
  case
    when not c.enabled then 'disabled'
    when coalesce(m.usd_estimate, 0) >= c.cap_usd_daily then 'capped'
    when coalesce(m.usd_estimate, 0) >= c.cap_usd_daily * c.alert_pct / 100.0 then 'warn'
    else 'ok'
  end as status
from ignis_function_caps c
left join ignis_daily_meter m
  on m.function_name = c.function_name
  and m.meter_date = (now() at time zone 'utc')::date;

grant select on ignis_spend_today to service_role;
