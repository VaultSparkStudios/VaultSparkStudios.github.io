-- Newsletter-only, bounded and recipient-private. Direct function callers are
-- subject to the same send budget as callers entering through the Worker.
create table if not exists public.desk_dispatch_limits (key text primary key, used integer not null default 0, window_start timestamptz not null default now());
alter table public.desk_dispatch_limits enable row level security;
revoke all on public.desk_dispatch_limits from anon, authenticated;
create or replace function public.desk_dispatch_claim(p_hash text)
returns text language plpgsql security definer set search_path = public as $$
declare n integer; t timestamptz;
begin
  if p_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid recipient hash'; end if;
  perform pg_advisory_xact_lock(736902);
  delete from desk_dispatch_limits where window_start < now() - interval '8 days';
  select window_start into t from desk_dispatch_limits where key = 'recipient:' || p_hash;
  if t > now() - interval '24 hours' then return 'duplicate'; end if;
  select used into n from desk_dispatch_limits where key = 'daily:' || to_char(now() at time zone 'UTC','YYYY-MM-DD');
  if coalesce(n,0) >= 100 then return 'limited'; end if;
  insert into desk_dispatch_limits(key,used,window_start) values ('recipient:'||p_hash,1,now()) on conflict(key) do update set used=1,window_start=now();
  insert into desk_dispatch_limits(key,used) values ('daily:'||to_char(now() at time zone 'UTC','YYYY-MM-DD'),1) on conflict(key) do update set used=desk_dispatch_limits.used+1;
  return 'allowed';
end $$;
drop function if exists public.desk_dispatch_token_allowed(text,boolean);
create or replace function public.desk_dispatch_token_allowed(p_hash text, p_revoke boolean default false, p_issued timestamptz default null)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if p_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid token hash'; end if;
  if p_revoke then insert into desk_dispatch_limits(key,used) values('revoked:'||p_hash,1) on conflict(key) do update set window_start=now(); return false; end if;
  return p_issued is not null and not exists(select 1 from desk_dispatch_limits where key='revoked:'||p_hash and window_start >= p_issued);
end $$;
revoke all on function public.desk_dispatch_claim(text) from public,anon,authenticated;
revoke all on function public.desk_dispatch_token_allowed(text,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.desk_dispatch_claim(text) to service_role;
grant execute on function public.desk_dispatch_token_allowed(text,boolean,timestamptz) to service_role;
