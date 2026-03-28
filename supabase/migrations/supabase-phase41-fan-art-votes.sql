-- ═══════════════════════════════════════════════════════════════════════════
-- VaultSpark Studios — Phase 41: fan_art_votes
-- Run in Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.fan_art_votes (
  id          uuid        primary key default gen_random_uuid(),
  fan_art_id  uuid        not null references public.fan_art_submissions(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (fan_art_id, user_id)
);

create index if not exists idx_fan_art_votes_art
  on public.fan_art_votes(fan_art_id);

create index if not exists idx_fan_art_votes_user
  on public.fan_art_votes(user_id);

alter table public.fan_art_votes enable row level security;

-- Anyone can read vote counts
drop policy if exists "fan_art_votes_select_public" on public.fan_art_votes;
create policy "fan_art_votes_select_public"
  on public.fan_art_votes for select
  to anon, authenticated
  using (true);

-- Authenticated members can vote
drop policy if exists "fan_art_votes_insert_own" on public.fan_art_votes;
create policy "fan_art_votes_insert_own"
  on public.fan_art_votes for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Members can remove their own vote
drop policy if exists "fan_art_votes_delete_own" on public.fan_art_votes;
create policy "fan_art_votes_delete_own"
  on public.fan_art_votes for delete
  to authenticated
  using (auth.uid() = user_id);
