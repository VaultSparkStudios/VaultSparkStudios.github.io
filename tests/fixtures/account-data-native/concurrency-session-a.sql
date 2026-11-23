-- Start A, wait for identity-lock-held stdout, then start session B separately.
begin;
set local statement_timeout='10s';
select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('f0000000-0000-4000-8000-000000000003',818));
select 'identity-lock-held';
select pg_catalog.pg_sleep(5);
-- B must already have aborted its contending write with 40001. A's subsequent
-- target-row update must succeed; no advisory/target-row deadlock may remain.
update account_data_lock_regression.vault_members set points=points+1;
rollback;
