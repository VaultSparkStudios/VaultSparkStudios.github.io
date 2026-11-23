-- Actual lifecycle RPCs on a declared, reduced disposable scaffold ONLY.
-- Provider checkpoints and metadata removal below are SIMULATED; no external
-- billing/marketing/Storage API acceptance or file-byte deletion is asserted.
begin;
set local statement_timeout='15s';
do $$ begin
  if current_database()<>'s418_website_export_native_20261123' then raise exception 'lifecycle fixture requires its exact disposable database';end if;
end $$;
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
update public.vault_members set username=case when id='41800000-0000-4000-8000-000000000001' then 'fixture-owner' else 'fixture-peer' end,
  subscribed=true,public_profile=true,referred_by=case when id='41800000-0000-4000-8000-000000000002' then '41800000-0000-4000-8000-000000000001'::uuid end;
update public.challenge_submissions set reviewed_by='41800000-0000-4000-8000-000000000001',proof_text='preserve-peer-proof';
update public.fan_art_submissions set file_path=member_id::text||'/lifecycle.png';
update public.desk_comments set id=case when user_id='41800000-0000-4000-8000-000000000001' then '41800000-0000-4000-8000-000000000011'::uuid else '41800000-0000-4000-8000-000000000012'::uuid end,
  body=case when user_id='41800000-0000-4000-8000-000000000001' then 'erase-owner-comment' else 'preserve-peer-reply' end,
  author_kind='member',display_name='fixture',status='approved',ip_hash='fixture-private-ip';
update public.desk_comments set parent_id='41800000-0000-4000-8000-000000000011' where user_id='41800000-0000-4000-8000-000000000002';
update public.teams set id=case when created_by='41800000-0000-4000-8000-000000000001' then '41800000-0000-4000-8000-000000000021'::uuid else '41800000-0000-4000-8000-000000000022'::uuid end;
update public.team_members set team_id='41800000-0000-4000-8000-000000000021';
insert into public.member_follows(follower_id,following_id) values
  ('41800000-0000-4000-8000-000000000001','41800000-0000-4000-8000-000000000002'),
  ('41800000-0000-4000-8000-000000000002','41800000-0000-4000-8000-000000000001'),
  ('41800000-0000-4000-8000-000000000002','41800000-0000-4000-8000-000000000003');
insert into public.subscriptions(user_id,plan,status,stripe_customer_id,stripe_subscription_id) values
  ('41800000-0000-4000-8000-000000000001','vault_sparked','active','cus_fixture','sub_fixture'),
  ('41800000-0000-4000-8000-000000000001','other_product','active','cus_shared_fixture','sub_shared_fixture'),
  ('41800000-0000-4000-8000-000000000002','vault_sparked','active','cus_peer_fixture','sub_peer_fixture');
insert into public.gift_subscriptions(gifter_id,recipient_id,stripe_session_id) values
  ('41800000-0000-4000-8000-000000000001','41800000-0000-4000-8000-000000000002','preserve-recipient-receipt'),
  ('41800000-0000-4000-8000-000000000002','41800000-0000-4000-8000-000000000001','preserve-gifter-receipt'),
  ('41800000-0000-4000-8000-000000000002','41800000-0000-4000-8000-000000000003','preserve-peer-only-receipt');
insert into public.invite_codes(code,used,used_by) values('fixture-consumed',true,'41800000-0000-4000-8000-000000000001');
insert into public.membership_phase_claims(session_id,user_id) values('fixture-consumed-phase','41800000-0000-4000-8000-000000000001');
-- Shared records are synthetic, not actual identity/approval/entitlement changes.
insert into public.profiles(id,handle,credit_balance) values('41800000-0000-4000-8000-000000000001','preserve-shared-profile',73);
insert into public.obelisk_identity_link(user_id,obelisk_sub) values('41800000-0000-4000-8000-000000000001','preserve-shared-subject');
insert into public.investors(user_id,status,notes) values('41800000-0000-4000-8000-000000000001','fixture-only','preserve-investor-relationship');
insert into public.beta_keys(claimed_by,key_code) values('41800000-0000-4000-8000-000000000001','preserve-consumed-game-key');
insert into storage.objects(bucket_id,name,owner,owner_id,metadata) values
  ('fan-art','41800000-0000-4000-8000-000000000001/lifecycle.png','41800000-0000-4000-8000-000000000001','41800000-0000-4000-8000-000000000001','{"fixture":"owner"}'),
  ('fan-art','41800000-0000-4000-8000-000000000002/peer.png','41800000-0000-4000-8000-000000000002','41800000-0000-4000-8000-000000000002','{"fixture":"peer"}'),
  ('other-product','41800000-0000-4000-8000-000000000001/shared.png','41800000-0000-4000-8000-000000000001','41800000-0000-4000-8000-000000000001','{"fixture":"shared"}');

set local role service_role;
do $$ declare uid uuid:='41800000-0000-4000-8000-000000000001';j jsonb;k jsonb;lease uuid;blocked boolean;begin
  j:=public.website_account_request(uid,' LIFECYCLE@example.invalid ');
  if j->>'state'<>'requested' or j->>'email'<>'lifecycle@example.invalid' or j->'billing'->>'subscription_id'<>'sub_fixture' or jsonb_array_length(j->'media_paths')<>1 then raise exception 'request snapshot incomplete';end if;
  k:=public.website_account_request(uid,'different@example.invalid');
  if k is distinct from j then raise exception 'request retry mutated original receipt';end if;
  j:=public.website_account_claim(uid);lease:=(j->>'lease_token')::uuid;
  if lease is null or j->>'state'<>'processing' or (j->>'attempts')::integer<>1 then raise exception 'claim unavailable';end if;
  if public.website_account_claim(uid) is not null then raise exception 'active lease was claimed twice';end if;
  blocked:=false;begin perform public.website_account_erase(uid,lease);exception when others then if sqlerrm='provider acceptance incomplete' then blocked:=true;else raise;end if;end;
  if not blocked then raise exception 'erase accepted absent provider checkpoints';end if;
  blocked:=false;begin perform public.website_account_checkpoint(uid,'41800000-0000-4000-8000-000000000099','billing');exception when others then if sqlerrm='lease unavailable' then blocked:=true;else raise;end if;end;
  if not blocked then raise exception 'wrong lease checkpoint accepted';end if;
  -- SIMULATED provider acceptance flags, NOT actual provider calls/receipts.
  perform public.website_account_checkpoint(uid,lease,'billing');
  perform public.website_account_checkpoint(uid,lease,'marketing');
  perform public.website_account_checkpoint(uid,lease,'media');
  perform public.website_account_checkpoint(uid,lease,'billing');
  blocked:=false;begin perform public.website_account_erase(uid,lease);exception when others then if sqlerrm='owned media remains' then blocked:=true;else raise;end if;end;
  if not blocked then raise exception 'erase accepted remaining owned media metadata';end if;
end $$;
reset role;
do $$ begin
  if (select subscribed or public_profile from public.vault_members where id='41800000-0000-4000-8000-000000000001') is distinct from false then raise exception 'request failed marketing/public suppression';end if;
  if not exists(select 1 from public.newsletter_preferences where user_id='41800000-0000-4000-8000-000000000001' and opted_out) then raise exception 'newsletter optout absent';end if;
end $$;
-- SIMULATED metadata-only cleanup on this scaffold, never Storage API/bytes proof.
delete from storage.objects where bucket_id='fan-art' and name='41800000-0000-4000-8000-000000000001/lifecycle.png';
set local role service_role;
do $$ declare uid uuid:='41800000-0000-4000-8000-000000000001';j jsonb;k jsonb;lease uuid;begin
  j:=public.website_account_status(uid);lease:=(j->>'lease_token')::uuid;
  j:=public.website_account_erase(uid,lease);
  if j->>'state'<>'erased' or j->>'erased_at' is null or j->'media_paths'<>'[]'::jsonb then raise exception 'actual erasure not recorded';end if;
  k:=public.website_account_erase(uid,lease);
  if k is distinct from j then raise exception 'erasure retry not idempotent';end if;
  -- SIMULATED confirmation checkpoint: no email is sent by this fixture.
  j:=public.website_account_checkpoint(uid,lease,'confirmation');
  if j->>'state'<>'completed' or j->>'completed_at' is null or j->>'email' is not null or j->>'lease_token' is not null then raise exception 'completion privacy/minimal receipt failed';end if;
  if public.website_account_claim(uid) is distinct from j then raise exception 'completed claim changed receipt';end if;
  if public.website_account_request(uid,'retry-must-not-return@example.invalid') is distinct from j then raise exception 'completed request resurrected receipt email/job';end if;
end $$;
reset role;
do $$ declare r record;own_rows integer;peer_rows integer;begin
  for r in select * from (values
    ('point_events','user_id'),('challenge_completions','user_id'),('member_achievements','member_id'),
    ('challenge_submissions','member_id'),('game_scores','user_id'),('season_xp','user_id'),
    ('newsletter_preferences','user_id'),('member_newsletter_log','user_id'),('weekly_game_scores','user_id'),
    ('journal_reactions','user_id'),('game_ratings','user_id'),('event_rsvps','user_id'),('poll_votes','user_id'),
    ('fan_art_votes','user_id'),('fan_art_submissions','member_id'),('vault_member_milestones','member_id'),
    ('push_subscriptions','user_id'),('ignis_usage_monthly','user_id'),('ignis_user_memory','user_id'),
    ('treasury_purchases','user_id'),('team_members','user_id')
  ) manifest(table_name,owner_column) loop
    execute format('select count(*) from public.%I where %I=$1',r.table_name,r.owner_column) into own_rows using '41800000-0000-4000-8000-000000000001'::uuid;
    execute format('select count(*) from public.%I where %I=$1',r.table_name,r.owner_column) into peer_rows using '41800000-0000-4000-8000-000000000002'::uuid;
    if own_rows<>0 or peer_rows<>1 then raise exception 'wrong manifest erasure/peer retention for %',r.table_name;end if;
  end loop;
  if (select count(*) from public.vault_members)<>1 or not exists(select 1 from public.vault_members where id='41800000-0000-4000-8000-000000000002' and referred_by is null and username='fixture-peer' and subscribed and public_profile) then raise exception 'peer member changed';end if;
  if (select count(*) from public.subscriptions)<>2 or exists(select 1 from public.subscriptions where user_id='41800000-0000-4000-8000-000000000001' and plan<>'other_product') then raise exception 'website/shared subscription boundary wrong';end if;
  if not exists(select 1 from public.subscriptions where plan='other_product' and stripe_subscription_id='sub_shared_fixture' and status='active') then raise exception 'shared billing row mutated';end if;
  if (select count(*) from public.desk_comments)<>2 or not exists(select 1 from public.desk_comments where id='41800000-0000-4000-8000-000000000011' and user_id is null and body='[removed]' and author_kind='guest' and status='removed' and ip_hash is null) or not exists(select 1 from public.desk_comments where body='preserve-peer-reply' and parent_id='41800000-0000-4000-8000-000000000011') then raise exception 'comment redaction/peer reply wrong';end if;
  if (select count(*) from public.teams)<>2 or not exists(select 1 from public.teams where id='41800000-0000-4000-8000-000000000021' and created_by is null) or not exists(select 1 from public.team_members where user_id='41800000-0000-4000-8000-000000000002' and team_id='41800000-0000-4000-8000-000000000021') then raise exception 'peer team membership destroyed';end if;
  if (select count(*) from public.gift_subscriptions)<>3 or not exists(select 1 from public.gift_subscriptions where gifter_id is null and recipient_id='41800000-0000-4000-8000-000000000002' and stripe_session_id='preserve-recipient-receipt') or not exists(select 1 from public.gift_subscriptions where recipient_id is null and gifter_id='41800000-0000-4000-8000-000000000002' and stripe_session_id='preserve-gifter-receipt') then raise exception 'gift peer attribution/receipt destroyed';end if;
  if not exists(select 1 from public.invite_codes where code='fixture-consumed' and used and used_by is null) or not exists(select 1 from public.membership_phase_claims where session_id='fixture-consumed-phase' and user_id is null) then raise exception 'consumed claim reused/deleted';end if;
  if (select count(*) from public.member_follows)<>1 or not exists(select 1 from public.member_follows where follower_id='41800000-0000-4000-8000-000000000002' and following_id='41800000-0000-4000-8000-000000000003') then raise exception 'unrelated peer social row destroyed';end if;
  if not exists(select 1 from public.challenge_submissions where member_id='41800000-0000-4000-8000-000000000002' and reviewed_by is null and proof_text='preserve-peer-proof') then raise exception 'peer proof redaction wrong';end if;
  if not exists(select 1 from public.profiles where handle='preserve-shared-profile' and credit_balance=73) or not exists(select 1 from public.obelisk_identity_link where obelisk_sub='preserve-shared-subject') or not exists(select 1 from public.investors where notes='preserve-investor-relationship' and status='fixture-only') or not exists(select 1 from public.beta_keys where key_code='preserve-consumed-game-key' and claimed_by='41800000-0000-4000-8000-000000000001') then raise exception 'shared product/identity/investor/game record destroyed';end if;
  if (select count(*) from storage.objects)<>2 or not exists(select 1 from storage.objects where metadata='{"fixture":"peer"}'::jsonb) or not exists(select 1 from storage.objects where metadata='{"fixture":"shared"}'::jsonb) then raise exception 'peer/shared media metadata destroyed';end if;
  if (select count(*) from public.website_account_deletions)<>1 or not exists(select 1 from public.website_account_deletions where user_id='41800000-0000-4000-8000-000000000001' and state='completed' and email is null and media_paths='[]'::jsonb) then raise exception 'durable completed tombstone missing';end if;
end $$;
-- The actual installed tombstone trigger prevents late recreation.
insert into public.vault_members(id,username) values('41800000-0000-4000-8000-000000000001','must-not-recreate');
insert into public.point_events(user_id,reason) values('41800000-0000-4000-8000-000000000001','must-not-recreate');
do $$ begin
  if exists(select 1 from public.vault_members where id='41800000-0000-4000-8000-000000000001') or exists(select 1 from public.point_events where user_id='41800000-0000-4000-8000-000000000001') then raise exception 'durable tombstone allowed recreation';end if;
  raise notice 'actual-lifecycle-erasure-peer-shared-preservation-tombstone-retry-verified-PROVIDERS-SIMULATED';
end $$;
rollback;
