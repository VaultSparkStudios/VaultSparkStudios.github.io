-- ─── Achievement Progress Tracking ────────────────────────────────────────────
-- Adds progress_max to the achievements table so the portal can render
-- a progress bar for multi-step achievements.

alter table achievements
  add column if not exists progress_max integer;

-- Default every binary achievement to progress_max = 1
update achievements set progress_max = 1 where progress_max is null;

-- Override with sensible values for known multi-step achievements
-- (adjust these IDs/slugs to match your actual achievement rows)
update achievements set progress_max = 100  where id = 'first_100';    -- reach 100 pts
update achievements set progress_max = 5    where id = 'patron';       -- invite 5 members
update achievements set progress_max = 1000 where id = 'lore_keeper';  -- read all lore
