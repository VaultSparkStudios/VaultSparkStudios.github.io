do $$ begin if current_database()<>'s418_website_waitlist_native_20261123' then raise exception 'refusing non-disposable database'; end if; end $$;
set statement_timeout='5s';
select public.website_account_request('f0000000-0000-4000-8000-000000000041','native-race@example.invalid')->>'state';
do $$ begin
 if public.website_waitlist_request('project:contender','native-race@example.invalid',repeat('8',64))->>'state'<>'limited' then raise exception 'concurrent capture bypassed global lock'; end if;
 begin perform public.website_waitlist_remove_email('native-race@example.invalid');raise exception 'expected waitlist cleanup contention';
 exception when serialization_failure then raise notice 'cleanup-40001-verified';end;
end $$;
