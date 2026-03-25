-- ─── Achievement Progress Tracking ────────────────────────────────────────────
-- Adds progress_max to the achievements table so the portal can render
-- a progress bar for multi-step achievements.

alter table achievements
  add column if not exists progress_max integer;

-- Default every binary achievement to progress_max = 1
update achievements set progress_max = 1 where progress_max is null;

-- Override with sensible values for known multi-step achievements (matched by title keyword)
update achievements set progress_max = 100  where title ilike '%100%' or title ilike '%first hundred%';
update achievements set progress_max = 5    where title ilike '%patron%' or title ilike '%subscribe%';
update achievements set progress_max = 1000 where title ilike '%lore%' or title ilike '%keeper%';
