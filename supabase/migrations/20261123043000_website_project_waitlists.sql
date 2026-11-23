-- Website-owned project-specific interest lists. Never reuse the shared
-- waitlist/atlas_waitlist tables: those have other product ownership/contracts.
begin;
create table if not exists public.website_project_waitlist (
  id uuid primary key default gen_random_uuid(),
  project_key text not null check(project_key ~ '^(game|project):[a-z0-9-]{1,80}$'),
  email text not null check(email=lower(btrim(email)) and char_length(email) between 6 and 254),
  state text not null default 'pending' check(state in ('pending','confirmed')),
  token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  token_expires_at timestamptz not null default now()+interval '24 hours',
  mail_state text not null default 'reserved' check(mail_state in ('reserved','accepted','rejected','uncertain')),
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique(project_key,email)
);
alter table public.website_project_waitlist enable row level security;
revoke all on public.website_project_waitlist from public,anon,authenticated;
grant select,insert,update,delete on public.website_project_waitlist to service_role;

create or replace function public.website_waitlist_request(p_project text,p_email text,p_token_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_row public.website_project_waitlist%rowtype; counter_key text; used integer;
begin
  if p_project !~ '^(game|project):[a-z0-9-]{1,80}$' or p_email is null or p_email<>lower(btrim(p_email))
    or char_length(p_email) not between 6 and 254 or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid waitlist request'; end if;
  if not pg_catalog.pg_try_advisory_xact_lock(818711) then return pg_catalog.jsonb_build_object('state','limited'); end if;
  if exists(select 1 from public.website_account_deletions where email=p_email) then
    return pg_catalog.jsonb_build_object('state','limited');
  end if;
  select * into current_row from public.website_project_waitlist where project_key=p_project and email=p_email for update;
  if found and (current_row.state='confirmed' or (current_row.requested_at>now()-interval '24 hours' and current_row.mail_state<>'rejected')) then return pg_catalog.jsonb_build_object('state','duplicate'); end if;
  -- Reuse the existing bounded, private rate-meter table, in its own namespace.
  counter_key:='project-waitlist:'||pg_catalog.to_char(now() at time zone 'UTC','YYYY-MM-DD');
  select limits.used into used from public.desk_dispatch_limits limits where key=counter_key;
  if coalesce(used,0)>=100 then return pg_catalog.jsonb_build_object('state','limited'); end if;
  insert into public.desk_dispatch_limits(key,used) values(counter_key,1)
    on conflict(key) do update set used=public.desk_dispatch_limits.used+1;
  insert into public.website_project_waitlist(project_key,email,token_hash) values(p_project,p_email,p_token_hash)
    on conflict(project_key,email) do update set token_hash=excluded.token_hash,token_expires_at=now()+interval '24 hours',
      mail_state='reserved',requested_at=now(),confirmed_at=null,state='pending';
  return pg_catalog.jsonb_build_object('state','reserved');
end $$;
create or replace function public.website_waitlist_delivery(p_token_hash text,p_state text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if p_state not in ('accepted','rejected','uncertain') then raise exception 'invalid delivery observation'; end if;
  update public.website_project_waitlist set mail_state=p_state where token_hash=p_token_hash and state='pending';
  return pg_catalog.jsonb_build_object('recorded',found);
end $$;
create or replace function public.website_waitlist_confirmation(p_token_hash text,p_confirm boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_row public.website_project_waitlist%rowtype;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then return null; end if;
  select * into current_row from public.website_project_waitlist where token_hash=p_token_hash for update;
  if not found or (current_row.state<>'confirmed' and current_row.token_expires_at<=now()) then return null; end if;
  if exists(select 1 from public.website_account_deletions where email=current_row.email) then return null; end if;
  if p_confirm and current_row.state='pending' then
    update public.website_project_waitlist set state='confirmed',confirmed_at=now() where id=current_row.id returning * into current_row;
  end if;
  return pg_catalog.jsonb_build_object('state',current_row.state,'project',current_row.project_key);
end $$;
create or replace function public.website_waitlist_remove_email(p_email text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
  if p_email is null or char_length(p_email) not between 6 and 254 then raise exception 'invalid verified email'; end if;
  -- Serialize with capture without waiting while a deletion worker holds locks.
  if not pg_catalog.pg_try_advisory_xact_lock(818711) then raise exception using errcode='40001',message='waitlist cleanup retry'; end if;
  delete from public.website_project_waitlist where email=lower(btrim(p_email));
  get diagnostics removed=row_count;
  return pg_catalog.jsonb_build_object('removed',removed);
end $$;
create or replace function public.website_waitlist_export_email(p_email text)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('project',project_key,'email',email,'state',state,
    'requested_at',requested_at,'confirmed_at',confirmed_at,'confirmation_send_status',mail_state)),'[]'::jsonb)
    from public.website_project_waitlist where email=lower(btrim(p_email))
$$;
create index if not exists website_account_deletions_pending_email_idx on public.website_account_deletions(email) where email is not null;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('website_waitlist_request','website_waitlist_delivery','website_waitlist_confirmation','website_waitlist_remove_email','website_waitlist_export_email') loop
    execute pg_catalog.format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute pg_catalog.format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
commit;
