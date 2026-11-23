-- Native PostgreSQL assertion, isolated staging DB only, after installing the
-- exact migration. Runs the ACTUAL installed trigger; all writes roll back.
-- psql -X --set=ON_ERROR_STOP=1 --file=<this-file>
begin;
set local statement_timeout='5s';
create temporary table gift_subscriptions(id integer primary key,gifter_id uuid,recipient_id uuid,receipt text);
create temporary table vault_members(id uuid primary key,referred_by uuid,points integer);
create temporary table challenge_submissions(id integer primary key,member_id uuid,reviewed_by uuid,proof_text text);
insert into gift_subscriptions values
  (1,'f0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000002','preserve-peer-receipt'),
  (2,'f0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000001','preserve-self-gift'),
  (3,'f0000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000001','preserve-peer-receipt');
insert into vault_members values('f0000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000001',17);
insert into challenge_submissions values(1,'f0000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000001','preserve-peer-proof');
insert into public.website_account_deletions(user_id,email) values
  ('f0000000-0000-4000-8000-000000000001','test-u@example.invalid'),
  ('f0000000-0000-4000-8000-000000000002','test-v@example.invalid');
create trigger privacy_guard before insert or update on gift_subscriptions for each row execute function public.website_account_guard_write('gifter_id','recipient_id');
create trigger privacy_guard before insert or update on vault_members for each row execute function public.website_account_guard_write('id');
create trigger privacy_guard before insert or update on challenge_submissions for each row execute function public.website_account_guard_write('member_id');
update gift_subscriptions set
  gifter_id=case when gifter_id='f0000000-0000-4000-8000-000000000001' then null else gifter_id end,
  recipient_id=case when recipient_id='f0000000-0000-4000-8000-000000000001' then null else recipient_id end;
update vault_members set referred_by=null;
update challenge_submissions set reviewed_by=null;
do $$ begin
  if exists(select 1 from gift_subscriptions where gifter_id='f0000000-0000-4000-8000-000000000001' or recipient_id='f0000000-0000-4000-8000-000000000001') then raise exception 'U attribution survived second tombstone'; end if;
  if (select recipient_id from gift_subscriptions where id=1) is distinct from 'f0000000-0000-4000-8000-000000000002'::uuid then raise exception 'V recipient lost'; end if;
  if (select gifter_id from gift_subscriptions where id=3) is distinct from 'f0000000-0000-4000-8000-000000000002'::uuid then raise exception 'V gifter lost'; end if;
  if exists(select 1 from gift_subscriptions where receipt not like 'preserve-%') then raise exception 'peer receipt changed'; end if;
  if exists(select 1 from vault_members where referred_by is not null) or exists(select 1 from challenge_submissions where reviewed_by is not null) then raise exception 'peer redaction suppressed'; end if;
end $$;
-- No blanket service-role bypass: content mutation/new attribution/INSERT must
-- still be suppressed even after a permitted redaction.
update vault_members set points=999;
update challenge_submissions set reviewed_by='f0000000-0000-4000-8000-000000000001';
insert into gift_subscriptions values(4,'f0000000-0000-4000-8000-000000000001',null,'must-not-insert');
update gift_subscriptions set recipient_id=null,receipt='changed-content' where id=1;
do $$ begin
  if (select points from vault_members)<>17 then raise exception 'entitlement/profile mutation bypassed tombstone'; end if;
  if exists(select 1 from challenge_submissions where reviewed_by is not null) then raise exception 'reference was reintroduced'; end if;
  if exists(select 1 from gift_subscriptions where id=4 or receipt='changed-content') then raise exception 'insert/content bypassed tombstone'; end if;
end $$;
rollback;
