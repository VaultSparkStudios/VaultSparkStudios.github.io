begin;
set local statement_timeout='2s';
do $$ declare expected boolean:=false; begin
  begin
    update account_data_lock_regression.vault_members set points=points+1;
  exception when serialization_failure then expected:=true;
  end;
  if not expected then raise exception 'expected immediate retryable 40001 while session A owns identity lock'; end if;
  raise notice 'nonblocking-40001-verified';
end $$;
rollback;
