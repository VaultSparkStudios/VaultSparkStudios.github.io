-- Website-owned request bounds, independent of existing per-function spend caps.
-- Reuses desk_dispatch_claim's transaction advisory-lock pattern. Every endpoint
-- shares the same principal/global buckets: endpoint or IP-hint rotation cannot
-- create another request allowance. Only service_role may invoke the RPC.
create table if not exists public.website_ai_request_limits (
  bucket_key text primary key,
  used integer not null check (used between 0 and 120),
  window_start timestamptz not null,
  constraint website_ai_request_bucket_key check (
    bucket_key ~ '^website-ai-v1:(global|anonymous|principal:[a-f0-9]{64})$'
  )
);
alter table public.website_ai_request_limits enable row level security;
revoke all on public.website_ai_request_limits from public, anon, authenticated, service_role;

create or replace function public.claim_website_ai_request(
  p_endpoint text, p_principal_hash text, p_anonymous boolean
) returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_now timestamptz;
  v_window timestamptz;
  v_global integer;
  v_anonymous integer;
  v_principal integer;
begin
  if p_endpoint is null or p_endpoint not in ('ask-ignis','semantic-search','eternal-intelligence')
    or p_principal_hash is null or p_principal_hash !~ '^[a-f0-9]{64}$'
    or p_anonymous is null then
    raise exception 'invalid website AI request admission';
  end if;
  perform pg_advisory_xact_lock(736903);
  v_now := clock_timestamp();
  v_window := date_trunc('minute', v_now);
  delete from public.website_ai_request_limits where window_start < v_window - interval '2 minutes';
  select used into v_global from public.website_ai_request_limits where bucket_key = 'website-ai-v1:global' and window_start = v_window;
  select used into v_anonymous from public.website_ai_request_limits where bucket_key = 'website-ai-v1:anonymous' and window_start = v_window;
  select used into v_principal from public.website_ai_request_limits where bucket_key = 'website-ai-v1:principal:' || p_principal_hash and window_start = v_window;
  -- 12 requests/principal, 60 anonymous requests and 120 total requests per UTC
  -- minute across the website AI family. All counters commit atomically.
  if coalesce(v_global,0) >= 120 or coalesce(v_principal,0) >= 12
    or (p_anonymous and coalesce(v_anonymous,0) >= 60) then return 'limited'; end if;
  insert into public.website_ai_request_limits(bucket_key,used,window_start)
    values ('website-ai-v1:global',1,v_window)
    on conflict(bucket_key) do update set used = case when website_ai_request_limits.window_start = v_window then website_ai_request_limits.used + 1 else 1 end, window_start = v_window;
  if p_anonymous then
    insert into public.website_ai_request_limits(bucket_key,used,window_start)
      values ('website-ai-v1:anonymous',1,v_window)
      on conflict(bucket_key) do update set used = case when website_ai_request_limits.window_start = v_window then website_ai_request_limits.used + 1 else 1 end, window_start = v_window;
  end if;
  insert into public.website_ai_request_limits(bucket_key,used,window_start)
    values ('website-ai-v1:principal:' || p_principal_hash,1,v_window)
    on conflict(bucket_key) do update set used = case when website_ai_request_limits.window_start = v_window then website_ai_request_limits.used + 1 else 1 end, window_start = v_window;
  return 'allowed';
end $$;
revoke all on function public.claim_website_ai_request(text,text,boolean) from public, anon, authenticated;
grant execute on function public.claim_website_ai_request(text,text,boolean) to service_role;
