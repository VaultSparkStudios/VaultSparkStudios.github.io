do $$ begin if current_database()<>'s418_website_waitlist_native_20261123' then raise exception 'refusing non-disposable database'; end if; end $$;
do $$ begin
 if public.website_waitlist_confirmation(repeat('9',64),true) is not null then raise exception 'captured-before-tombstone token confirmed after deletion'; end if;
 if public.website_waitlist_request('project:later','native-race@example.invalid',repeat('7',64))->>'state'<>'limited' then raise exception 'durable tombstone bypassed later capture'; end if;
 if public.website_waitlist_remove_email('native-race@example.invalid')->>'removed'<>'1' then raise exception 'deletion retry did not remove raced capture'; end if;
 if exists(select 1 from public.website_project_waitlist where email='native-race@example.invalid') then raise exception 'raced waitlist row survived cleanup'; end if;
end $$;
select 'tombstone-capture-confirm-cleanup-race-passed';
