do $$ begin if current_database()<>'s418_website_waitlist_native_20261123' then raise exception 'refusing non-disposable database'; end if; end $$;
-- DISPOSABLE TEST DATABASE ONLY.
truncate public.website_project_waitlist,public.desk_dispatch_limits,public.website_account_deletions;
insert into public.vault_members(id,username) values('f0000000-0000-4000-8000-000000000041','NativeWaitlistFixture');
