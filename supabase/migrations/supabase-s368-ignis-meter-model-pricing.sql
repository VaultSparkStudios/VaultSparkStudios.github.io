-- ═══════════════════════════════════════════════════════════════════════════
-- S368 · model-currency-and-caching + ai-endpoint-abuse-caps
-- increment_ignis_meter prices each call by model, and stops being callable by
-- anonymous / member roles.
--
-- Before: every call was priced at Sonnet 4.6 rates ($3 / $15 per MTok) no matter
-- which model answered, and the SECURITY DEFINER function kept Postgres' default
-- EXECUTE-to-PUBLIC grant — any visitor holding the public anon key could call
-- it through PostgREST and inflate a function's daily spend until its cap
-- tripped (a cheap denial of service against Ask IGNIS / search).
--
-- Compatibility: the old 5-argument signature is DROPPED and replaced by a single
-- 6-argument function whose p_model defaults to NULL, so every existing caller
-- that passes the 5 named arguments resolves to it unchanged. (Keeping both
-- overloads would make a 5-argument named call ambiguous in PostgREST.)
-- Edge functions deployed before this migration keep working: tokenMeter.ts
-- retries without p_model if the database rejects it.
--
-- Prices (USD per MTok) — verify against current pricing page
-- (https://www.anthropic.com/pricing); source: Claude API model catalog
-- cached 2026-09-25. Mirror: supabase/functions/_shared/modelPricing.ts.
--   claude-sonnet-5-5   in 2.00  out 10.00  cache read 0.20  cache write 2.50
--   claude-haiku-4-5    in 1.00  out  5.00  cache read 0.10  cache write 1.25
--   claude-opus-5-5     in 4.00  out 20.00  cache read 0.20  cache write 5.00
--   default / unknown   in 3.00  out 15.00  cache read 0.30  cache write 3.75
--
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

drop function if exists public.increment_ignis_meter(text, bigint, bigint, bigint, bigint);

create or replace function public.increment_ignis_meter(
  p_function_name  text,
  p_input_tokens   bigint,
  p_output_tokens  bigint,
  p_cache_read     bigint default 0,
  p_cache_create   bigint default 0,
  p_model          text   default null
) returns table (
  total_usd      numeric,
  cap_usd        numeric,
  pct_of_cap     numeric,
  would_breach   boolean,
  was_first_70   boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_model          text := lower(coalesce(p_model, ''));
  v_in_rate        numeric;
  v_out_rate       numeric;
  v_read_rate      numeric;
  v_write_rate     numeric;
  v_call_cost      numeric;
  v_today          date := (now() at time zone 'utc')::date;
  v_prev_usd       numeric;
  v_new_usd        numeric;
  v_cap            numeric;
  v_alert_pct      smallint;
  v_was_first_70   boolean := false;
begin
  -- Per-model price table (USD per million tokens). Verify against current pricing page.
  if v_model like '%claude-sonnet-5-5%' then
    v_in_rate := 2.00; v_out_rate := 10.00; v_read_rate := 0.20; v_write_rate := 2.50;
  elsif v_model like '%claude-haiku-4-5%' then
    v_in_rate := 1.00; v_out_rate := 5.00;  v_read_rate := 0.10; v_write_rate := 1.25;
  elsif v_model like '%claude-opus-5-5%' then
    v_in_rate := 4.00; v_out_rate := 20.00; v_read_rate := 0.20; v_write_rate := 5.00;
  else
    -- Unknown or omitted model: legacy Sonnet 4.6 rates (over-counts toward caps).
    v_in_rate := 3.00; v_out_rate := 15.00; v_read_rate := 0.30; v_write_rate := 3.75;
  end if;

  v_call_cost := (greatest(coalesce(p_input_tokens, 0), 0)  * v_in_rate
                + greatest(coalesce(p_output_tokens, 0), 0) * v_out_rate
                + greatest(coalesce(p_cache_read, 0), 0)    * v_read_rate
                + greatest(coalesce(p_cache_create, 0), 0)  * v_write_rate) / 1000000.0;

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
    (v_today, p_function_name, coalesce(p_input_tokens, 0), coalesce(p_output_tokens, 0),
     coalesce(p_cache_read, 0), coalesce(p_cache_create, 0), 1, v_call_cost, now())
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

-- Service role only (edge functions). Supabase's default privileges also grant
-- EXECUTE on new functions to anon and authenticated, so revoke explicitly.
revoke all on function public.increment_ignis_meter(text, bigint, bigint, bigint, bigint, text) from public;
revoke execute on function public.increment_ignis_meter(text, bigint, bigint, bigint, bigint, text) from anon;
revoke execute on function public.increment_ignis_meter(text, bigint, bigint, bigint, bigint, text) from authenticated;
grant execute on function public.increment_ignis_meter(text, bigint, bigint, bigint, bigint, text) to service_role;

-- Verification:
--   begin; select * from increment_ignis_meter('semantic-search', 0, 0); rollback;  -- legacy call shape still resolves (writes, hence the rollback)
--   select has_function_privilege('anon', 'public.increment_ignis_meter(text,bigint,bigint,bigint,bigint,text)', 'execute');  -- false
