-- ═══════════════════════════════════════════════════════════════════════════
-- VaultSpark Studios — Phase 27–35 Pending Migrations
-- Run these in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── Phase 27: scheduled pulses ───────────────────────────────────────────────
alter table public.studio_pulse
  add column if not exists publish_at timestamptz;

comment on column public.studio_pulse.publish_at is
  'If set, the pulse is not visible until this UTC timestamp passes.';


-- ── Phase 31: journal view counts ────────────────────────────────────────────
create table if not exists public.journal_views (
  id         uuid        primary key default gen_random_uuid(),
  post_slug  text        not null,
  session_id text        not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_journal_views_slug
  on public.journal_views(post_slug, created_at desc);

-- Prevent the same session counting twice for the same post on the same day
create unique index if not exists uq_journal_views_session_day
  on public.journal_views(post_slug, session_id, (created_at::date));

alter table public.journal_views enable row level security;

-- Anyone (including anon) can insert a view
create policy "journal_views_insert"
  on public.journal_views for insert
  to anon, authenticated
  with check (true);

-- Anyone can read view counts (for the counter display)
create policy "journal_views_select"
  on public.journal_views for select
  to anon, authenticated
  using (true);


-- ── Phase 32: game ratings ────────────────────────────────────────────────────
create table if not exists public.game_ratings (
  game_slug  text    not null,
  user_id    uuid    not null references auth.users(id) on delete cascade,
  rating     int     not null check (rating between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (game_slug, user_id)
);

create index if not exists idx_game_ratings_slug
  on public.game_ratings(game_slug);

alter table public.game_ratings enable row level security;

-- Authenticated users can upsert their own rating
create policy "game_ratings_upsert_own"
  on public.game_ratings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "game_ratings_update_own"
  on public.game_ratings for update
  to authenticated
  using (auth.uid() = user_id);

-- Anyone can read ratings (for aggregate display)
create policy "game_ratings_select"
  on public.game_ratings for select
  to anon, authenticated
  using (true);


-- ── Phase 33: event RSVPs ─────────────────────────────────────────────────────
create table if not exists public.event_rsvps (
  event_slug text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_slug, user_id)
);

create index if not exists idx_event_rsvps_event
  on public.event_rsvps(event_slug);

alter table public.event_rsvps enable row level security;

-- Authenticated users can insert/delete their own RSVP
create policy "event_rsvps_insert_own"
  on public.event_rsvps for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "event_rsvps_delete_own"
  on public.event_rsvps for delete
  to authenticated
  using (auth.uid() = user_id);

-- Anyone can read RSVP counts
create policy "event_rsvps_select"
  on public.event_rsvps for select
  to anon, authenticated
  using (true);


-- ── Phase 34: investor document access log ────────────────────────────────────
create table if not exists public.investor_document_access (
  id               uuid        primary key default gen_random_uuid(),
  document_id      uuid        references public.investor_documents(id) on delete set null,
  document_title   text,
  investor_id      uuid        references auth.users(id) on delete set null,
  investor_name    text,
  accessed_at      timestamptz not null default now()
);

create index if not exists idx_inv_doc_access_doc
  on public.investor_document_access(document_id, accessed_at desc);

create index if not exists idx_inv_doc_access_investor
  on public.investor_document_access(investor_id, accessed_at desc);

alter table public.investor_document_access enable row level security;

-- Authenticated investors can insert their own access log
create policy "inv_doc_access_insert_own"
  on public.investor_document_access for insert
  to authenticated
  with check (auth.uid() = investor_id);

-- Admin can read all access logs
create policy "inv_doc_access_admin_select"
  on public.investor_document_access for select
  to authenticated
  using (public.is_vault_admin());
