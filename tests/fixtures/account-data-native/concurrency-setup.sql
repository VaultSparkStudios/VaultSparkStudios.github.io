-- ISOLATED TEST DATABASE ONLY. Never run on production.
begin;
create schema account_data_lock_regression;
create table account_data_lock_regression.vault_members(id uuid primary key,referred_by uuid,points integer);
insert into account_data_lock_regression.vault_members values('f0000000-0000-4000-8000-000000000003',null,10);
create trigger privacy_guard before insert or update on account_data_lock_regression.vault_members for each row execute function public.website_account_guard_write('id');
commit;
