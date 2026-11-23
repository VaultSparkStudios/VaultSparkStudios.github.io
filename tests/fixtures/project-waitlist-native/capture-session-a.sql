do $$ begin if current_database()<>'s418_website_waitlist_native_20261123' then raise exception 'refusing non-disposable database'; end if; end $$;
-- Capture holds the actual shared SQL admission lock while deletion commits.
begin;
select public.website_waitlist_request('game:race','native-race@example.invalid',repeat('9',64));
select 'waitlist-capture-held';
select pg_sleep(12);
commit;
