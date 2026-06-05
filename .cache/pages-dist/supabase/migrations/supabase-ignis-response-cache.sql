-- IGNIS Semantic Response Cache
-- Caches single-turn IGNIS replies for 24 hours, keyed by SHA-256 of normalized question.
-- Multi-turn conversation replies are NOT cached (context-dependent).
-- Max 200 rows enforced by the cleanup trigger.

create table if not exists ignis_response_cache (
  id               bigserial primary key,
  question_hash    text        not null,
  question_text    text        not null,
  reply            text        not null,
  model            text        not null,
  page_context     text,
  hit_count        integer     not null default 1,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default (now() + interval '24 hours')
);

create unique index if not exists ignis_response_cache_hash_idx
  on ignis_response_cache (question_hash);

create index if not exists ignis_response_cache_expires_idx
  on ignis_response_cache (expires_at);

-- RLS: anon can read (for potential future public cache inspection); service role can write.
alter table ignis_response_cache enable row level security;

create policy "anon_read_ignis_cache"
  on ignis_response_cache for select
  using (true);

create policy "service_write_ignis_cache"
  on ignis_response_cache for all
  using (auth.role() = 'service_role');

-- Auto-cleanup: remove expired entries and enforce 200-row cap on each insert.
create or replace function ignis_cache_cleanup() returns trigger language plpgsql as $$
begin
  -- Remove expired rows
  delete from ignis_response_cache where expires_at < now();
  -- Enforce cap
  delete from ignis_response_cache
  where id in (
    select id from ignis_response_cache
    order by created_at asc
    offset 200
  );
  return null;
end;
$$;

create or replace trigger ignis_cache_cleanup_trigger
  after insert on ignis_response_cache
  for each statement execute function ignis_cache_cleanup();
