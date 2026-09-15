-- ══════════════════════════════════════════════════════════════════════
-- The Desk — community comments (S356)
-- ══════════════════════════════════════════════════════════════════════
-- Anyone can comment on a Desk story. The Cloudflare Worker
-- (cloudflare/desk-comments.mjs) is the ONLY reader and writer: it runs the
-- automatic filter (cloudflare/comment-filter.mjs) and inserts every
-- submission with status = the filter verdict, so borderline comments are
-- stored as 'held' and are never auto-published.
--
-- Access model: RLS is enabled and anon / authenticated hold NO privileges on
-- either table or on the report function. Browsers never reach these tables
-- directly; the Worker uses the service role and projects only public fields
-- (ip_hash, user_id, filter_* and report counts never leave the edge).
--
-- Apply:  node scripts/apply-supabase-migration.mjs --migration supabase/migrations/20260914_desk_comments.sql --dry-run
--         node scripts/apply-supabase-migration.mjs --migration supabase/migrations/20260914_desk_comments.sql --apply
-- Probe:  node scripts/apply-supabase-migration.mjs --probe desk-comments
--
-- Idempotent — every statement is guarded and safe to re-run.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Comments ───────────────────────────────────────────────────────
create table if not exists public.desk_comments (
  id             uuid        primary key default gen_random_uuid(),
  story_slug     text        not null check (story_slug ~ '^\d{4}-\d{2}-\d{2}/[a-z0-9-]{1,120}$'),
  -- One reply level is enforced by the Worker (a parent must be top-level).
  parent_id      uuid        null references public.desk_comments(id) on delete cascade,
  body           text        not null check (char_length(body) between 2 and 1500),
  author_kind    text        not null check (author_kind in ('guest', 'member')),
  user_id        uuid        null,
  display_name   text        not null check (char_length(display_name) between 1 and 40),
  status         text        not null default 'held'
                             check (status in ('published', 'held', 'rejected', 'removed')),
  featured       boolean     not null default false,
  filter_score   smallint,
  filter_reasons text[],
  report_count   smallint    not null default 0,
  ip_hash        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint desk_comments_member_identity check (
    (author_kind = 'guest' and user_id is null) or (author_kind = 'member' and user_id is not null)
  ),
  constraint desk_comments_not_self_parent check (parent_id is null or parent_id <> id)
);

create index if not exists desk_comments_story_status_created_idx
  on public.desk_comments (story_slug, status, created_at desc);

create index if not exists desk_comments_parent_idx
  on public.desk_comments (parent_id) where parent_id is not null;

-- Operator review queue: held or reported comments, newest first.
create index if not exists desk_comments_review_idx
  on public.desk_comments (created_at desc) where status = 'held' or report_count > 0;

create or replace function public.desk_comments_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

revoke all on function public.desk_comments_touch() from public, anon, authenticated;

drop trigger if exists desk_comments_touch on public.desk_comments;
create trigger desk_comments_touch
  before update on public.desk_comments
  for each row execute function public.desk_comments_touch();

-- ── 2. Reports (one per comment per daily-salted reporter hash) ───────
create table if not exists public.desk_comment_reports (
  comment_id uuid        not null references public.desk_comments(id) on delete cascade,
  ip_hash    text        not null,
  reason     text        check (reason is null or char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  primary key (comment_id, ip_hash)
);

-- ── 3. Lock both tables away from every client role ───────────────────
alter table public.desk_comments        enable row level security;
alter table public.desk_comment_reports enable row level security;

revoke all on table public.desk_comments        from public, anon, authenticated;
revoke all on table public.desk_comment_reports from public, anon, authenticated;

grant select, insert, update, delete on table public.desk_comments        to service_role;
grant select, insert, update, delete on table public.desk_comment_reports to service_role;

-- ── 4. Atomic report intake ───────────────────────────────────────────
-- One round trip from the Worker: dedupe on (comment_id, ip_hash), bump the
-- counter, and pull the comment back to 'held' at three distinct reports.
-- Reports against a comment that is not published are acknowledged but not
-- counted. Executable by service_role only.
create or replace function public.desk_comment_report(p_comment_id uuid, p_ip_hash text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status   text;
  v_inserted integer;
  v_count    integer;
begin
  if p_comment_id is null or p_ip_hash is null or char_length(p_ip_hash) not between 16 and 128 then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  select status into v_status from public.desk_comments where id = p_comment_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_status <> 'published' then
    return jsonb_build_object('ok', true, 'counted', false, 'status', v_status);
  end if;

  insert into public.desk_comment_reports (comment_id, ip_hash, reason)
  values (p_comment_id, p_ip_hash, left(nullif(btrim(coalesce(p_reason, '')), ''), 200))
  on conflict (comment_id, ip_hash) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return jsonb_build_object('ok', true, 'counted', false, 'duplicate', true, 'status', v_status);
  end if;

  update public.desk_comments
     set report_count = least(report_count + 1, 32000),
         status       = case when report_count + 1 >= 3 then 'held' else status end
   where id = p_comment_id
  returning report_count, status into v_count, v_status;

  return jsonb_build_object('ok', true, 'counted', true, 'status', v_status, 'reportCount', v_count);
end
$$;

revoke all on function public.desk_comment_report(uuid, text, text) from public, anon, authenticated;
grant execute on function public.desk_comment_report(uuid, text, text) to service_role;
