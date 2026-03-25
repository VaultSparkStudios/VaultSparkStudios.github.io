-- =============================================================================
-- VaultSpark Studios — Phase 11 SQL Migration
-- Run these in order against your Supabase project.
-- All statements are idempotent (safe to re-run).
-- =============================================================================


-- ─── SECTION 1: Daily Login Streak ────────────────────────────────────────────
-- Tracks the current daily-login streak and the last date the member logged in.
-- The portal checks last_login_date on each load: if it differs from today (UTC)
-- it awards 10 XP, increments streak_count, and sets last_login_date = CURRENT_DATE.

alter table vault_members
  add column if not exists streak_count    integer not null default 0,
  add column if not exists last_login_date date;


-- ─── SECTION 2: Challenge Categories + Seasonal Challenges ───────────────────
-- Adds a category enum and an optional expiry timestamp to the challenges table.
-- The portal uses category for filter pills and expires_at for countdown badges.

alter table challenges
  add column if not exists category   text not null default 'General'
    check (category in ('Daily','Weekly','Lore','Game','Social','One-Time','General')),
  add column if not exists expires_at timestamptz;

-- Auto-categorise existing challenges by keyword matching
update challenges set category = 'Social'
  where title ilike '%discord%'
     or title ilike '%share%'
     or title ilike '%refer%';

update challenges set category = 'Lore'
  where title ilike '%lore%'
     or title ilike '%archive%'
     or title ilike '%classified%';

update challenges set category = 'Game'
  where title ilike '%game%'
     or title ilike '%play%'
     or title ilike '%football%';


-- ─── SECTION 3: Achievement Progress Tracking ─────────────────────────────────
-- Adds progress_max so the portal can render progress bars for multi-step
-- achievements (e.g. "Earn 100 pts" shows X / 100 until unlocked).

alter table achievements
  add column if not exists progress_max integer;

-- Default every binary achievement to 1
update achievements set progress_max = 1 where progress_max is null;

-- Adjust specific achievements with known thresholds (matched by name/slug keyword)
update achievements set progress_max = 100  where name ilike '%100%' or slug ilike '%100%';
update achievements set progress_max = 5    where name ilike '%patron%' or slug ilike '%patron%';
update achievements set progress_max = 1000 where name ilike '%lore%' or slug ilike '%lore%';
