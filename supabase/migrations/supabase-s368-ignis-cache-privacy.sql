-- ═══════════════════════════════════════════════════════════════════════════
-- S368 · ignis-cache-privacy + ai-endpoint-abuse-caps
--
-- 1. ignis_response_cache becomes service-role only.
--    It was created with `anon_read_ignis_cache` (select using (true)), so every
--    cached Ask IGNIS reply — including single-turn replies generated with a
--    member's memory + profile hints, and the Eternal-tier quarterly dispatch
--    written by eternal-intelligence — was readable by anyone holding the public
--    anon key through /rest/v1/ignis_response_cache. Only the edge functions
--    (service role) ever read or write it.
-- 2. One-time purge of the Ask IGNIS reply rows. They were keyed on the question
--    alone and may hold a member-personalised reply; the S368 edge function keys
--    on mode | tier | context | question and never caches personalised prompts,
--    so old keys could not be hit again anyway. The Eternal dispatch rows
--    (page_context = 'vault-member/eternal-intelligence') are kept: they are
--    keyed on their own grounding hash and contain no per-member data.
-- 3. semantic_search_cache: 24h response cache for the public Cmd+K synthesis
--    (semantic-search edge function). RLS on, no policies, no anon/authenticated
--    privileges — service role only.
--
-- Idempotent: safe to re-run (the purge only removes rows written before the
-- S368 key format existed on the first run; on re-runs it clears transient
-- non-Eternal cache rows, which is harmless).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. ignis_response_cache: service role only ───────────────────────────
alter table if exists public.ignis_response_cache enable row level security;

drop policy if exists "anon_read_ignis_cache" on public.ignis_response_cache;
drop policy if exists "service_write_ignis_cache" on public.ignis_response_cache;
create policy "service_write_ignis_cache"
  on public.ignis_response_cache for all
  to service_role
  using (true) with check (true);

revoke all on table public.ignis_response_cache from anon;
revoke all on table public.ignis_response_cache from authenticated;
grant select, insert, update, delete on table public.ignis_response_cache to service_role;

-- Fix the 200-row ceiling: the original trigger ordered oldest-first and deleted
-- everything past OFFSET 200, i.e. it evicted the NEWEST rows (including the row
-- just inserted) once the table was full. Keep the newest 200 instead.
create or replace function public.ignis_cache_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.ignis_response_cache where expires_at < now();
  delete from public.ignis_response_cache
   where id in (
     select id from public.ignis_response_cache
      order by created_at desc
      offset 200
   );
  return null;
end;
$$;

revoke all on function public.ignis_cache_cleanup() from public;
revoke execute on function public.ignis_cache_cleanup() from anon;
revoke execute on function public.ignis_cache_cleanup() from authenticated;

-- ── 2. One-time purge of question-only-keyed Ask IGNIS replies ───────────
delete from public.ignis_response_cache
 where page_context is distinct from 'vault-member/eternal-intelligence';

-- ── 3. semantic_search_cache ─────────────────────────────────────────────
create table if not exists public.semantic_search_cache (
  cache_key    text        primary key,           -- sha256(normalized query | sources | intel version)
  payload      jsonb       not null,              -- { synthesis, sources[], model }
  model        text,
  hit_count    integer     not null default 0,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '24 hours')
);

create index if not exists semantic_search_cache_expires_idx
  on public.semantic_search_cache (expires_at);

alter table public.semantic_search_cache enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS) may touch it.
revoke all on table public.semantic_search_cache from anon;
revoke all on table public.semantic_search_cache from authenticated;
grant select, insert, update, delete on table public.semantic_search_cache to service_role;

-- Expired-row sweep + 2,000-row ceiling, once per insert statement.
create or replace function public.semantic_search_cache_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.semantic_search_cache where expires_at < now();
  delete from public.semantic_search_cache
   where cache_key in (
     select cache_key from public.semantic_search_cache
      order by created_at desc
      offset 2000
   );
  return null;
end;
$$;

revoke all on function public.semantic_search_cache_cleanup() from public;
revoke execute on function public.semantic_search_cache_cleanup() from anon;
revoke execute on function public.semantic_search_cache_cleanup() from authenticated;

drop trigger if exists semantic_search_cache_cleanup_trigger on public.semantic_search_cache;
create trigger semantic_search_cache_cleanup_trigger
  after insert on public.semantic_search_cache
  for each statement execute function public.semantic_search_cache_cleanup();

-- Verification (as anon, via PostgREST):
--   GET /rest/v1/ignis_response_cache?select=reply&limit=1   → 401/permission denied (was: rows)
--   GET /rest/v1/semantic_search_cache?select=payload&limit=1 → 401/permission denied
