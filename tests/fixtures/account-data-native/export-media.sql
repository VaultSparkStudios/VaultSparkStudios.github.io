-- Actual export RPC assertions on a DECLARED metadata-derived disposable scaffold.
-- This does not assert provider constraints, Storage runtime/bytes, or stage parity.
begin;
set local statement_timeout='15s';
do $$ begin
  if current_database()<>'s418_website_export_native_20261123' then
    raise exception 'export fixture requires its exact disposable database';
  end if;
end $$;

-- Each manifest section has both an own and peer row. Reduced test tables
-- deliberately have no production NOT NULL/FK/default/policy parity claim.
do $$ declare r record; begin
  for r in select * from (values
    ('vault_members','id'),('point_events','user_id'),('challenge_completions','user_id'),
    ('member_achievements','member_id'),('challenge_submissions','member_id'),('game_scores','user_id'),
    ('season_xp','user_id'),('newsletter_preferences','user_id'),('member_newsletter_log','user_id'),
    ('weekly_game_scores','user_id'),('journal_reactions','user_id'),('game_ratings','user_id'),
    ('event_rsvps','user_id'),('poll_votes','user_id'),('fan_art_submissions','member_id'),
    ('fan_art_votes','user_id'),('vault_member_milestones','member_id'),('push_subscriptions','user_id'),
    ('ignis_usage_monthly','user_id'),('ignis_user_memory','user_id'),('treasury_purchases','user_id'),
    ('team_members','user_id'),('teams','created_by'),('desk_comments','user_id')
  ) manifest(table_name,owner_column) loop
    execute format('insert into public.%I(%I) values($1),($2)',r.table_name,r.owner_column)
      using '41800000-0000-4000-8000-000000000001'::uuid,'41800000-0000-4000-8000-000000000002'::uuid;
  end loop;
end $$;
update public.point_events set label='own-point-0',reason='own-points',points=1
  where user_id='41800000-0000-4000-8000-000000000001';
update public.point_events set label='peer-point-must-not-export',points=999
  where user_id='41800000-0000-4000-8000-000000000002';
insert into public.point_events(user_id,label,reason,points)
  select '41800000-0000-4000-8000-000000000001','own-point-'||i,'own-points',1 from generate_series(1,1200) i;
update public.challenge_submissions set reviewed_by='41800000-0000-4000-8000-000000000003',review_note='PRIVATE_REVIEW_SENTINEL';
update public.newsletter_preferences set unsubscribe_token='PRIVATE_UNSUBSCRIBE_SENTINEL';
update public.fan_art_submissions set admin_notes='PRIVATE_ADMIN_SENTINEL',file_path=member_id::text||'/fan-art.png';
update public.desk_comments set ip_hash='PRIVATE_IP_SENTINEL',filter_score=99,filter_reasons='["PRIVATE_FILTER_SENTINEL"]'::jsonb;
insert into public.member_follows(follower_id,following_id) values
  ('41800000-0000-4000-8000-000000000001','41800000-0000-4000-8000-000000000002'),
  ('41800000-0000-4000-8000-000000000002','41800000-0000-4000-8000-000000000001'),
  ('41800000-0000-4000-8000-000000000002','41800000-0000-4000-8000-000000000003');
insert into public.subscriptions(user_id,plan,stripe_customer_id,stripe_subscription_id)
  select '41800000-0000-4000-8000-000000000001',plan,'cus_PRIVATE_CUSTOMER_SENTINEL','sub_PRIVATE_SUBSCRIPTION_SENTINEL'
  from unnest(array['vault_sparked','vault_sparked_pro','vault_sparked_annual','vault_sparked_pro_annual','other_product']) plan;
insert into public.subscriptions(user_id,plan,stripe_customer_id,stripe_subscription_id) values
  ('41800000-0000-4000-8000-000000000002','vault_sparked','cus_PEER_SENTINEL','sub_PEER_SENTINEL');
insert into public.gift_subscriptions(gifter_id,recipient_id,stripe_session_id) values
  ('41800000-0000-4000-8000-000000000001','41800000-0000-4000-8000-000000000002','cs_PRIVATE_SESSION_SENTINEL'),
  ('41800000-0000-4000-8000-000000000002','41800000-0000-4000-8000-000000000001','cs_PRIVATE_SESSION_SENTINEL'),
  ('41800000-0000-4000-8000-000000000002','41800000-0000-4000-8000-000000000003','cs_PEER_ONLY_SENTINEL');
insert into storage.objects(bucket_id,name,owner,owner_id,metadata) values
  ('fan-art','41800000-0000-4000-8000-000000000001/fan-art.png','41800000-0000-4000-8000-000000000001','41800000-0000-4000-8000-000000000001','{"mimetype":"image/png","size":418}'::jsonb),
  ('fan-art','41800000-0000-4000-8000-000000000001/folder/second.webp','41800000-0000-4000-8000-000000000001','41800000-0000-4000-8000-000000000001','{"mimetype":"image/webp","size":419}'::jsonb),
  ('fan-art','41800000-0000-4000-8000-000000000002/peer.png','41800000-0000-4000-8000-000000000002','41800000-0000-4000-8000-000000000002','{"sentinel":"PEER_MEDIA_MUST_NOT_EXPORT"}'::jsonb),
  ('another-product','41800000-0000-4000-8000-000000000001/other.png','41800000-0000-4000-8000-000000000001','41800000-0000-4000-8000-000000000001','{"sentinel":"OTHER_BUCKET_MUST_NOT_EXPORT"}'::jsonb);

-- Invoke the real SECURITY DEFINER RPC as service_role, not a copied query.
set local role service_role;
do $$
declare
  uid uuid:='41800000-0000-4000-8000-000000000001'; j jsonb; r record; item jsonb;
  expected text[]:=array['vault_members','point_events','challenge_completions','member_achievements',
    'challenge_submissions','game_scores','season_xp','newsletter_preferences','member_newsletter_log',
    'weekly_game_scores','journal_reactions','game_ratings','event_rsvps','poll_votes','fan_art_submissions',
    'fan_art_votes','vault_member_milestones','push_subscriptions','ignis_usage_monthly','ignis_user_memory',
    'treasury_purchases','team_members','teams','desk_comments','member_follows','website_subscriptions','gift_subscriptions'];
  actual text[]; n integer;
begin
  j:=public.website_account_export(uid);
  if j->>'complete'<>'true' or j->>'schema_version'<>'1.0' or j->>'user_id'<>uid::text then raise exception 'export envelope incomplete'; end if;
  select array_agg(k order by k) into actual from jsonb_object_keys(j->'tables') k;
  if actual is distinct from (select array_agg(x order by x) from unnest(expected) x) then raise exception 'missing or extra scoped table'; end if;
  select array_agg(k order by k) into actual from jsonb_object_keys(j->'table_counts') k;
  if actual is distinct from (select array_agg(x order by x) from unnest(expected) x) then raise exception 'missing or extra table count'; end if;
  for r in select key,value from jsonb_each(j->'tables') loop
    n:=case r.key when 'point_events' then 1201 when 'member_follows' then 2 when 'website_subscriptions' then 4 when 'gift_subscriptions' then 2 else 1 end;
    if jsonb_typeof(r.value)<>'array' or jsonb_array_length(r.value)<>n or (j->'table_counts'->>r.key)::integer<>n then raise exception 'wrong complete/isolated count for %',r.key; end if;
    for item in select value from jsonb_array_elements(r.value) loop
      if r.key='member_follows' then
        if item->>'follower_id'<>uid::text and item->>'following_id'<>uid::text then raise exception 'peer follow leaked';end if;
      elsif r.key='gift_subscriptions' then
        if item->>'gifter_id'<>uid::text and item->>'recipient_id'<>uid::text then raise exception 'peer gift leaked';end if;
      elsif coalesce(item->>'user_id',item->>'member_id',item->>'created_by',case when r.key='vault_members' then item->>'id' end) is distinct from uid::text then
        raise exception 'peer ownership leaked in %',r.key;
      end if;
    end loop;
  end loop;
  if (select count(distinct value->>'label') from jsonb_array_elements(j->'tables'->'point_events'))<>1201 then raise exception 'point export duplicate/truncated';end if;
  if j::text like '%PRIVATE_%' or j::text like '%PEER_%' or j::text like '%OTHER_BUCKET_%' or j::text like '%peer-point-must-not-export%' then raise exception 'private/peer sentinel leaked'; end if;
  for r in select * from (values
    ('challenge_submissions','reviewed_by'),('challenge_submissions','review_note'),
    ('newsletter_preferences','unsubscribe_token'),('fan_art_submissions','admin_notes'),
    ('desk_comments','ip_hash'),('desk_comments','filter_score'),('desk_comments','filter_reasons'),
    ('website_subscriptions','stripe_customer_id'),('website_subscriptions','stripe_subscription_id'),
    ('gift_subscriptions','stripe_session_id')
  ) forbidden(table_name,column_name) loop
    if exists(select 1 from jsonb_array_elements(j->'tables'->r.table_name) e where e ? r.column_name) then raise exception 'private key % survived in %',r.column_name,r.table_name;end if;
  end loop;
  if jsonb_array_length(j->'media')<>2 then raise exception 'media ownership/bucket isolation failed';end if;
  for item in select value from jsonb_array_elements(j->'media') loop
    select array_agg(k order by k) into actual from jsonb_object_keys(item) k;
    if actual is distinct from array['bucket','metadata','path']::text[] or item->>'bucket'<>'fan-art' or item->>'path' not like uid::text||'/%' then raise exception 'media includes unowned path or extra private fields';end if;
    if item->'metadata' not in ('{"mimetype":"image/png","size":418}'::jsonb,'{"mimetype":"image/webp","size":419}'::jsonb) then raise exception 'media metadata not preserved';end if;
  end loop;
  if j::text like '%download_url%' or j::text like '%https://%' or j::text like '%fjnpzjjyhnpmunfoycrp%' then raise exception 'SQL export embeds external/production media authority';end if;
  raise notice 'export-complete27-counts-own1201-private-redaction-media-isolation-verified';
end $$;
reset role;
do $$ begin
  if (select count(*) from public.point_events)<>1202 or (select count(*) from storage.objects)<>4 then raise exception 'read export mutated peer/source rows';end if;
end $$;
rollback;
