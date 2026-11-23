-- S418: current first-party Claude API Sonnet 5.5 cache-hit price only.
-- Verified 2026-11-23: https://platform.claude.com/docs/en/about-claude/pricing
-- $0.10 per million cache-read tokens (0.05x input); other model rates,
-- caps, caller grants and accounting behavior are preserved. Historical
-- migrations stay unchanged. Apply through the normal staged migration path.
begin;

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
    v_in_rate := 2.00; v_out_rate := 10.00; v_read_rate := 0.10; v_write_rate := 2.50;
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


commit;
