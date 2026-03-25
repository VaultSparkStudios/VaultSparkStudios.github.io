-- ─── Achievement Progress Tracking ────────────────────────────────────────────
-- Adds progress_max to the achievements table so the portal can render
-- a progress bar for multi-step achievements.

alter table achievements
  add column if not exists progress_max integer;

-- Default every binary achievement to progress_max = 1
update achievements set progress_max = 1 where progress_max is null;

-- Override with sensible values for known multi-step achievements (matched by name/slug keyword)
update achievements set progress_max = 100  where name ilike '%100%' or slug ilike '%100%';
update achievements set progress_max = 5    where name ilike '%patron%' or slug ilike '%patron%';
update achievements set progress_max = 1000 where name ilike '%lore%' or slug ilike '%lore%';
