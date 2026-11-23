-- Website membership export and resumable erasure. Shared auth, Obelisk links,
-- PromoGrind, investment relationships and cross-product gameplay are retained.
-- Apply only after staging schema/ownership and actual provider acceptance checks.
-- Service-only functions: the edge authenticates a confirmed provider identity.
begin;

create table if not exists public.website_account_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text,
  state text not null default 'requested' check (state in ('requested','processing','erased','completed')),
  requested_at timestamptz not null default now(),
  erased_at timestamptz,
  completed_at timestamptz,
  billing jsonb,
  media_paths jsonb not null default '[]'::jsonb,
  billing_done boolean not null default false,
  marketing_done boolean not null default false,
  media_done boolean not null default false,
  lease_token uuid,
  lease_until timestamptz,
  attempts integer not null default 0,
  last_error_code text,
  constraint website_account_destination_size check (email is null or char_length(email) between 3 and 254)
);
comment on table public.website_account_deletions is
  'Service-only website erasure job/tombstone; no shared Auth deletion. Email/media paths retained only until confirmation; user_id, minimal billing references and request status prevent recreation and support cancellation receipts. No arbitrary legal retention deadline is asserted.';
alter table public.website_account_deletions enable row level security;
revoke all on public.website_account_deletions from public, anon, authenticated;
grant select, insert, update on public.website_account_deletions to service_role;

-- Allow removal of attribution without deleting another member's team or gift.
alter table public.teams alter column created_by drop not null;
alter table public.gift_subscriptions alter column gifter_id drop not null;
alter table public.gift_subscriptions alter column recipient_id drop not null;

create or replace function public.website_account_request(p_user_id uuid, p_email text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare j public.website_account_deletions%rowtype; b jsonb; paths jsonb;
begin
  if p_user_id is null or p_email is null or char_length(p_email) not between 3 and 254 then raise exception 'invalid request'; end if;
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,818)) then
    raise exception 'website identity busy; retry request' using errcode='40001';
  end if;
  select * into j from public.website_account_deletions where user_id=p_user_id for update;
  if found then return pg_catalog.to_jsonb(j); end if;
  if not exists(select 1 from public.vault_members where id=p_user_id) then raise exception 'website membership not found'; end if;
  select pg_catalog.jsonb_build_object('plan',s.plan,'subscription_id',s.stripe_subscription_id,'customer_id',s.stripe_customer_id)
    into b from public.subscriptions s where s.user_id=p_user_id
    and s.plan in ('vault_sparked','vault_sparked_pro','vault_sparked_annual','vault_sparked_pro_annual');
  if b is not null and ((b->>'subscription_id') is null or (b->>'customer_id') is null) then
    -- Inactive/free records need no external cancellation; active records with
    -- incomplete provenance must never be claimed as cancelled.
    if exists(select 1 from public.subscriptions where user_id=p_user_id and status in ('active','trialing','past_due','unpaid')) then
      raise exception 'website billing provenance unavailable';
    end if;
    b:=null;
  end if;
  if exists(select 1 from public.fan_art_submissions where member_id=p_user_id
      and (file_path not like p_user_id::text||'/%' or file_path ~ '(^|/)\.\.?(/|$)' or file_path like E'%\\%')) then
    raise exception 'media ownership unverified';
  end if;
  select coalesce(pg_catalog.jsonb_agg(name order by name),'[]'::jsonb) into paths from (
    select name from storage.objects where bucket_id='fan-art' and name like p_user_id::text||'/%'
    union select file_path from public.fan_art_submissions where member_id=p_user_id
  ) objects;
  -- Suppress member marketing before installing the write tombstone.
  update public.vault_members set subscribed=false, public_profile=false where id=p_user_id;
  insert into public.newsletter_preferences(user_id,opted_out,opted_out_at,updated_at)
    values(p_user_id,true,now(),now()) on conflict(user_id) do update set opted_out=true,opted_out_at=now(),updated_at=now();
  insert into public.website_account_deletions(user_id,email,billing,media_paths)
    values(p_user_id,pg_catalog.lower(pg_catalog.btrim(p_email)),b,paths) returning * into j;
  return pg_catalog.to_jsonb(j);
end $$;

create or replace function public.website_account_claim(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare j public.website_account_deletions%rowtype;
begin
  select * into j from public.website_account_deletions where user_id=p_user_id for update;
  if not found then return null; end if;
  if j.state='completed' then return pg_catalog.to_jsonb(j); end if;
  if j.lease_until is not null and j.lease_until>now() then return null; end if;
  update public.website_account_deletions set lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',
    state=case when erased_at is null then 'processing' else 'erased' end, attempts=attempts+1,last_error_code=null
    where user_id=p_user_id returning * into j;
  return pg_catalog.to_jsonb(j);
end $$;

create or replace function public.website_account_checkpoint(p_user_id uuid,p_lease uuid,p_step text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare j public.website_account_deletions%rowtype;
begin
  select * into j from public.website_account_deletions where user_id=p_user_id for update;
  if not found or p_lease is null or j.lease_token is null or j.lease_until is null
    or j.lease_token is distinct from p_lease or j.lease_until<=now() then raise exception 'lease unavailable'; end if;
  if p_step not in ('billing','marketing','media','confirmation') then raise exception 'unknown checkpoint'; end if;
  if p_step='confirmation' and j.erased_at is null then raise exception 'erasure unverified'; end if;
  update public.website_account_deletions set
    billing_done=billing_done or p_step='billing',marketing_done=marketing_done or p_step='marketing',media_done=media_done or p_step='media',
    state=case when p_step='confirmation' then 'completed' else state end,
    completed_at=case when p_step='confirmation' then now() else completed_at end,
    email=case when p_step='confirmation' then null else email end,
    media_paths=case when p_step='confirmation' then '[]'::jsonb else media_paths end,
    lease_until=case when p_step='confirmation' then null else now()+interval '5 minutes' end,
    lease_token=case when p_step='confirmation' then null else lease_token end,last_error_code=null
    where user_id=p_user_id returning * into j;
  return pg_catalog.to_jsonb(j);
end $$;

create or replace function public.website_account_fail(p_user_id uuid,p_lease uuid,p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_code !~ '^[a-z_]{1,64}$' then raise exception 'invalid error code'; end if;
  update public.website_account_deletions set last_error_code=p_code,lease_until=null,lease_token=null
    where user_id=p_user_id and lease_token=p_lease;
  return pg_catalog.jsonb_build_object('recorded',found);
end $$;

create or replace function public.website_account_status(p_user_id uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select pg_catalog.to_jsonb(j) from public.website_account_deletions j where user_id=p_user_id
$$;
create or replace function public.website_account_pending(p_limit integer default 5)
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(pg_catalog.jsonb_agg(user_id),'[]'::jsonb) from (
    select user_id from public.website_account_deletions where state<>'completed'
      and (lease_until is null or lease_until<now()) order by requested_at limit greatest(1,least(p_limit,5))
  ) pending
$$;

-- Explicit manifest, not "every table with a UUID" in the shared database.
-- No PostgREST row-limit truncation: aggregation occurs inside PostgreSQL.
create or replace function public.website_account_export(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare row record; result jsonb:='{}'::jsonb; rows jsonb; counts jsonb:='{}'::jsonb;
begin
  if p_user_id is null then raise exception 'identity required'; end if;
  for row in select * from (values
    ('vault_members','id',array[]::text[]),('point_events','user_id',array[]::text[]),
    ('challenge_completions','user_id',array[]::text[]),('member_achievements','member_id',array[]::text[]),
    ('challenge_submissions','member_id',array['reviewed_by','review_note']::text[]),
    ('game_scores','user_id',array[]::text[]),('season_xp','user_id',array[]::text[]),
    ('newsletter_preferences','user_id',array['unsubscribe_token']::text[]),('member_newsletter_log','user_id',array[]::text[]),
    ('weekly_game_scores','user_id',array[]::text[]),('journal_reactions','user_id',array[]::text[]),
    ('game_ratings','user_id',array[]::text[]),('event_rsvps','user_id',array[]::text[]),('poll_votes','user_id',array[]::text[]),
    ('fan_art_submissions','member_id',array['admin_notes']::text[]),('fan_art_votes','user_id',array[]::text[]),
    ('vault_member_milestones','member_id',array[]::text[]),('push_subscriptions','user_id',array[]::text[]),
    ('ignis_usage_monthly','user_id',array[]::text[]),('ignis_user_memory','user_id',array[]::text[]),
    ('treasury_purchases','user_id',array[]::text[]),('team_members','user_id',array[]::text[]),('teams','created_by',array[]::text[]),
    ('desk_comments','user_id',array['ip_hash','filter_score','filter_reasons']::text[])
  ) manifest(table_name,owner_column,omit_columns) loop
    execute pg_catalog.format('select coalesce(jsonb_agg(to_jsonb(t)-$2),''[]''::jsonb) from public.%I t where %I=$1',row.table_name,row.owner_column)
      into rows using p_user_id,row.omit_columns;
    result:=result||pg_catalog.jsonb_build_object(row.table_name,rows);
    counts:=counts||pg_catalog.jsonb_build_object(row.table_name,pg_catalog.jsonb_array_length(rows));
  end loop;
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(f)),'[]'::jsonb) into rows
    from public.member_follows f where follower_id=p_user_id or following_id=p_user_id;
  result:=result||pg_catalog.jsonb_build_object('member_follows',rows);
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(s)-array['stripe_customer_id','stripe_subscription_id']),'[]'::jsonb) into rows
    from public.subscriptions s where user_id=p_user_id and plan in ('vault_sparked','vault_sparked_pro','vault_sparked_annual','vault_sparked_pro_annual');
  result:=result||pg_catalog.jsonb_build_object('website_subscriptions',rows);
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(g)-'stripe_session_id'),'[]'::jsonb) into rows
    from public.gift_subscriptions g where gifter_id=p_user_id or recipient_id=p_user_id;
  result:=result||pg_catalog.jsonb_build_object('gift_subscriptions',rows);
  select pg_catalog.jsonb_object_agg(key,pg_catalog.jsonb_array_length(value)) into counts from pg_catalog.jsonb_each(result);
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('bucket','fan-art','path',name,'metadata',metadata)),'[]'::jsonb) into rows
    from storage.objects where bucket_id='fan-art' and name like p_user_id::text||'/%';
  return pg_catalog.jsonb_build_object('schema_version','1.0','complete',true,'user_id',p_user_id,
    'scope','website membership records; media originals referenced by downloadable URL, not embedded',
    'tables',result,'table_counts',counts,'media',rows);
end $$;

create or replace function public.website_account_erase(p_user_id uuid,p_lease uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare j public.website_account_deletions%rowtype; row record; remains boolean;
begin
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,818)) then
    raise exception 'website identity busy; retry erasure' using errcode='40001';
  end if;
  select * into j from public.website_account_deletions where user_id=p_user_id for update;
  if not found or p_lease is null or j.lease_token is null or j.lease_until is null
    or j.lease_token is distinct from p_lease or j.lease_until<=now() then raise exception 'lease unavailable'; end if;
  if j.erased_at is not null then return pg_catalog.to_jsonb(j); end if;
  if not (j.billing_done and j.marketing_done and j.media_done) then raise exception 'provider acceptance incomplete'; end if;
  if exists(select 1 from storage.objects where bucket_id='fan-art' and name like p_user_id::text||'/%') then raise exception 'owned media remains'; end if;
  -- Redaction preserves other members' replies and their membership of teams.
  update public.desk_comments set user_id=null,author_kind='guest',display_name='Deleted member',body='[removed]',status='removed',ip_hash=null,filter_reasons=null,filter_score=null where user_id=p_user_id;
  update public.teams set created_by=null where created_by=p_user_id;
  update public.gift_subscriptions set
    gifter_id=case when gifter_id=p_user_id then null else gifter_id end,
    recipient_id=case when recipient_id=p_user_id then null else recipient_id end
    where gifter_id=p_user_id or recipient_id=p_user_id;
  update public.vault_members set referred_by=null where referred_by=p_user_id;
  update public.invite_codes set used_by=null where used_by=p_user_id;
  -- beta_keys is a shared game entitlement ledger. Clearing claimed_by would
  -- make issued keys available again; keep its consumed claim outside scope.
  update public.membership_phase_claims set user_id=null where user_id=p_user_id;
  update public.challenge_submissions set reviewed_by=null where reviewed_by=p_user_id;
  delete from public.member_follows where follower_id=p_user_id or following_id=p_user_id;
  for row in select * from (values
    ('point_events','user_id'),('challenge_completions','user_id'),('member_achievements','member_id'),
    ('challenge_submissions','member_id'),('game_scores','user_id'),('season_xp','user_id'),
    ('newsletter_preferences','user_id'),('member_newsletter_log','user_id'),('weekly_game_scores','user_id'),
    ('journal_reactions','user_id'),('game_ratings','user_id'),('event_rsvps','user_id'),('poll_votes','user_id'),
    ('fan_art_votes','user_id'),('fan_art_submissions','member_id'),('vault_member_milestones','member_id'),
    ('push_subscriptions','user_id'),('ignis_usage_monthly','user_id'),('ignis_user_memory','user_id'),
    ('treasury_purchases','user_id'),('team_members','user_id')
  ) manifest(table_name,owner_column) loop
    execute pg_catalog.format('delete from public.%I where %I=$1',row.table_name,row.owner_column) using p_user_id;
    execute pg_catalog.format('select exists(select 1 from public.%I where %I=$1)',row.table_name,row.owner_column) into remains using p_user_id;
    if remains then raise exception 'website erasure postcondition failed: %',row.table_name; end if;
  end loop;
  delete from public.subscriptions where user_id=p_user_id and plan in ('vault_sparked','vault_sparked_pro','vault_sparked_annual','vault_sparked_pro_annual');
  delete from public.vault_members where id=p_user_id;
  if exists(select 1 from public.desk_comments where user_id=p_user_id)
    or exists(select 1 from public.teams where created_by=p_user_id)
    or exists(select 1 from public.gift_subscriptions where gifter_id=p_user_id or recipient_id=p_user_id)
    or exists(select 1 from public.vault_members where id=p_user_id or referred_by=p_user_id)
    or exists(select 1 from public.challenge_submissions where reviewed_by=p_user_id)
    or exists(select 1 from public.invite_codes where used_by=p_user_id)
    or exists(select 1 from public.membership_phase_claims where user_id=p_user_id)
    or exists(select 1 from public.member_follows where follower_id=p_user_id or following_id=p_user_id)
    or exists(select 1 from public.subscriptions where user_id=p_user_id and plan in
      ('vault_sparked','vault_sparked_pro','vault_sparked_annual','vault_sparked_pro_annual')) then
    raise exception 'website attribution erasure postcondition failed';
  end if;
  -- No Auth/Obelisk/global customer/investment/product erasure occurs here.
  update public.website_account_deletions set state='erased',erased_at=now(),media_paths='[]'::jsonb,last_error_code=null
    where user_id=p_user_id returning * into j;
  return pg_catalog.to_jsonb(j);
end $$;

-- A BEFORE ROW trigger already holds PostgreSQL's target-row lock. It must
-- NEVER wait for an identity advisory lock held by a request/erasure which may
-- be waiting for that row. Every identity lock is therefore a try-lock: a busy
-- writer/request/eraser aborts with retryable 40001 instead of forming a cycle.
-- Suppressed service writes are no-ops, so Stripe retry events cannot resurrect
-- a removed website membership or cause an endless failed webhook queue.
create or replace function public.website_account_guard_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare k text; uid uuid; value text; item jsonb:=pg_catalog.to_jsonb(new);
  previous_item jsonb; candidate jsonb; reference_columns text[]:=tg_argv; removed_reference boolean:=false; only_removal boolean:=true;
begin
  if tg_table_name='subscriptions' and coalesce(item->>'plan','') not in
      ('vault_sparked','vault_sparked_pro','vault_sparked_annual','vault_sparked_pro_annual') then return new; end if;
  if tg_table_schema='storage' then
    if item->>'bucket_id'<>'fan-art' then return new; end if;
    value:=pg_catalog.split_part(item->>'name','/',1);
    if value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return new; end if;
    uid:=value::uuid;
    if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,818)) then
      raise exception 'website identity busy; retry write' using errcode='40001';
    end if;
    if exists(select 1 from public.website_account_deletions where user_id=uid) then return null; end if;
    return new;
  end if;
  -- Another participant may ALSO have a tombstone. Permit strict removal of
  -- existing attribution, never new references or changed content/entitlements.
  -- This is role-independent: service webhooks receive no blanket bypass.
  if tg_op='UPDATE' then
    previous_item:=pg_catalog.to_jsonb(old);
    if tg_table_name='vault_members' then reference_columns:=reference_columns||array['referred_by']; end if;
    if tg_table_name='challenge_submissions' then reference_columns:=reference_columns||array['reviewed_by']; end if;
    if (item-reference_columns)=(previous_item-reference_columns) then
      foreach k in array reference_columns loop
        if (item->k) is not distinct from (previous_item->k) then continue; end if;
        if previous_item->>k is not null and item->>k is null then removed_reference:=true;
        else only_removal:=false; end if;
      end loop;
      if only_removal and removed_reference then return new; end if;
    end if;
    if tg_table_name='desk_comments' and previous_item->>'user_id' is not null and item->>'user_id' is null
      and item->>'author_kind'='guest' and item->>'display_name'='Deleted member' and item->>'body'='[removed]'
      and item->>'status'='removed' and item->>'ip_hash' is null and item->>'filter_reasons' is null and item->>'filter_score' is null
      and (item-array['user_id','author_kind','display_name','body','status','ip_hash','filter_reasons','filter_score','updated_at'])
        =(previous_item-array['user_id','author_kind','display_name','body','status','ip_hash','filter_reasons','filter_score','updated_at']) then
      return new;
    end if;
  end if;
  -- Check OLD as well as NEW: clearing the last deleted identity while also
  -- changing content/entitlements cannot sidestep the tombstone by producing a
  -- NEW row with no remaining identity columns.
  foreach candidate in array array[item,previous_item] loop
    foreach k in array reference_columns loop
      value:=candidate->>k;
      if value is null then continue; end if;
      uid:=value::uuid;
      if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,818)) then
        raise exception 'website identity busy; retry write' using errcode='40001';
      end if;
      if exists(select 1 from public.website_account_deletions where user_id=uid) then return null; end if;
    end loop;
  end loop;
  return new;
end $$;

do $$ declare row record; begin
  for row in select * from (values
    ('vault_members','id'),('subscriptions','user_id'),('point_events','user_id'),('challenge_completions','user_id'),
    ('member_achievements','member_id'),('challenge_submissions','member_id'),('game_scores','user_id'),('season_xp','user_id'),
    ('newsletter_preferences','user_id'),('member_newsletter_log','user_id'),('weekly_game_scores','user_id'),
    ('journal_reactions','user_id'),('game_ratings','user_id'),('event_rsvps','user_id'),('poll_votes','user_id'),
    ('fan_art_votes','user_id'),('fan_art_submissions','member_id'),('vault_member_milestones','member_id'),
    ('push_subscriptions','user_id'),('ignis_usage_monthly','user_id'),('ignis_user_memory','user_id'),
    ('treasury_purchases','user_id'),('team_members','user_id'),('desk_comments','user_id'),('teams','created_by')
  ) manifest(table_name,owner_column) loop
    execute pg_catalog.format('drop trigger if exists website_account_tombstone on public.%I',row.table_name);
    execute pg_catalog.format('create trigger website_account_tombstone before insert or update on public.%I for each row execute function public.website_account_guard_write(%L)',row.table_name,row.owner_column);
  end loop;
end $$;
drop trigger if exists website_account_tombstone on public.member_follows;
create trigger website_account_tombstone before insert or update on public.member_follows for each row
  execute function public.website_account_guard_write('follower_id','following_id');
drop trigger if exists website_account_tombstone on public.gift_subscriptions;
create trigger website_account_tombstone before insert or update on public.gift_subscriptions for each row
  execute function public.website_account_guard_write('gifter_id','recipient_id');
drop trigger if exists website_account_tombstone on storage.objects;
create trigger website_account_tombstone before insert or update on storage.objects for each row execute function public.website_account_guard_write();

do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('website_account_request','website_account_claim','website_account_checkpoint',
      'website_account_fail','website_account_status','website_account_pending','website_account_export','website_account_erase','website_account_guard_write') loop
    execute pg_catalog.format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute pg_catalog.format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
commit;
