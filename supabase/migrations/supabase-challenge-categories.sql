-- ─── Challenge Categories + Seasonal Expiry ───────────────────────────────────
-- Adds a category enum column and optional expires_at to the challenges table.

alter table challenges
  add column if not exists category   text not null default 'General'
    check (category in ('Daily','Weekly','Lore','Game','Social','One-Time','General')),
  add column if not exists expires_at timestamptz;

-- Categorise existing challenges by keyword matching
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
