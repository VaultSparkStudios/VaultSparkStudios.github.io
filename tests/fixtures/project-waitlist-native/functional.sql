do $$ begin if current_database()<>'s418_website_waitlist_native_20261123' then raise exception 'refusing non-disposable database'; end if; end $$;
-- DISPOSABLE TEST DATABASE ONLY. Exact candidate migrations must already exist.
set statement_timeout='8s';
truncate public.website_project_waitlist,public.desk_dispatch_limits,public.website_account_deletions;
do $$ declare first jsonb; again jsonb; stamp timestamptz; expiry timestamptz; begin
 first:=public.website_waitlist_request('game:fixture-a','native-one@example.invalid',repeat('a',64));
 if first->>'state'<>'reserved' then raise exception 'first request not reserved'; end if;
 if public.website_waitlist_request('game:fixture-a','native-one@example.invalid',repeat('b',64))->>'state'<>'duplicate' then raise exception 'same project/email not idempotent'; end if;
 if public.website_waitlist_request('project:fixture-b','native-one@example.invalid',repeat('c',64))->>'state'<>'reserved' then raise exception 'independent project not distinct'; end if;
 if (select count(*) from public.website_project_waitlist)<>2 or (select sum(used) from public.desk_dispatch_limits)<>2 then raise exception 'duplicate consumed capacity or created enrollment'; end if;
 if public.website_waitlist_confirmation(repeat('a',64),false)->>'state'<>'pending' then raise exception 'view mutated pending consent'; end if;
 if exists(select 1 from public.website_project_waitlist where confirmed_at is not null) then raise exception 'view supplied consent'; end if;
 perform public.website_waitlist_delivery(repeat('a',64),'accepted');
 if public.website_waitlist_confirmation(repeat('a',64),true)->>'state'<>'confirmed' then raise exception 'explicit confirmation failed'; end if;
 select confirmed_at,token_expires_at into stamp,expiry from public.website_project_waitlist where token_hash=repeat('a',64);
 again:=public.website_waitlist_confirmation(repeat('a',64),true);
 if again<>jsonb_build_object('state','confirmed','project','game:fixture-a') or again ? 'email' then raise exception 'repeat leaked or changed receipt'; end if;
 if (select confirmed_at from public.website_project_waitlist where token_hash=repeat('a',64)) is distinct from stamp or (select token_expires_at from public.website_project_waitlist where token_hash=repeat('a',64)) is distinct from expiry then raise exception 'repeat refreshed consent or expiry'; end if;
 update public.website_project_waitlist set token_expires_at=now()-interval '1 day' where token_hash in(repeat('a',64),repeat('c',64));
 if public.website_waitlist_confirmation(repeat('c',64),true) is not null then raise exception 'expired pending token accepted'; end if;
 if public.website_waitlist_confirmation(repeat('a',64),true)<>again then raise exception 'confirmed receipt not idempotent after expiry'; end if;
 if (select count(*) from public.website_project_waitlist)<>2 or (select confirmed_at from public.website_project_waitlist where token_hash=repeat('a',64)) is distinct from stamp then raise exception 'idempotent repeat changed enrollment'; end if;
 if public.website_waitlist_confirmation(repeat('f',64),true) is not null or public.website_waitlist_confirmation('malformed',true) is not null then raise exception 'unknown token accepted'; end if;
end $$;
-- Rejected sends may be retried with a new token; uncertain sends do not resend.
do $$ begin
 perform public.website_waitlist_delivery(repeat('c',64),'rejected');
 if public.website_waitlist_request('project:fixture-b','native-one@example.invalid',repeat('d',64))->>'state'<>'reserved' then raise exception 'rejected request not retryable'; end if;
 if public.website_waitlist_confirmation(repeat('c',64),true) is not null then raise exception 'old replaced token survived'; end if;
 perform public.website_waitlist_delivery(repeat('d',64),'uncertain');
 if public.website_waitlist_request('project:fixture-b','native-one@example.invalid',repeat('e',64))->>'state'<>'duplicate' then raise exception 'uncertain delivery resent'; end if;
end $$;
-- Authenticated verified-email ownership is enforced by the edge. These SQL
-- helpers are service-only and accept ONLY that caller-supplied verified email.
do $$ declare exported jsonb; removed jsonb; begin
 perform public.website_waitlist_request('game:fixture-a','native-other@example.invalid',repeat('e',64));
 exported:=public.website_waitlist_export_email('  NATIVE-ONE@EXAMPLE.INVALID  ');
 if jsonb_array_length(exported)<>2 or exists(select 1 from jsonb_array_elements(exported) as entry(value) where value->>'email'<>'native-one@example.invalid' or value ? 'token_hash') then raise exception 'export ownership/projection incorrect'; end if;
 removed:=public.website_waitlist_remove_email(' NATIVE-ONE@EXAMPLE.INVALID ');
 if removed->>'removed'<>'2' or public.website_waitlist_export_email('native-one@example.invalid')<>'[]'::jsonb or (select count(*) from public.website_project_waitlist where email='native-other@example.invalid')<>1 then raise exception 'email cleanup touched peer or left own records'; end if;
end $$;
-- The daily SQL bound is website-owned and distinct from existing Dispatch.
truncate public.website_project_waitlist,public.desk_dispatch_limits;
insert into public.desk_dispatch_limits(key,used) values('daily:unrelated-dispatch',37);
do $$ declare i integer; allowed integer:=0; limited integer:=0; answer text; day text:=to_char(now() at time zone 'UTC','YYYY-MM-DD'); begin
 for i in 1..101 loop
  answer:=public.website_waitlist_request('game:bounded','native-'||i||'@example.invalid',md5(i::text)||md5('salt'||i))->>'state';
  if answer='reserved' then allowed:=allowed+1; elsif answer='limited' then limited:=limited+1; else raise exception 'unexpected rate state'; end if;
 end loop;
 if day<>to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD') then raise exception 'UTC day boundary invalidates rate proof'; end if;
 if allowed<>100 or limited<>1 or (select used from public.desk_dispatch_limits where key='project-waitlist:'||day)<>100 then raise exception 'SQL daily bound incorrect'; end if;
 if (select used from public.desk_dispatch_limits where key='daily:unrelated-dispatch')<>37 then raise exception 'waitlist reused unrelated Dispatch namespace'; end if;
end $$;
select 'functional-idempotency-expiry-export-removal-rate-passed';
