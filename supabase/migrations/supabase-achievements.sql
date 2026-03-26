-- ═══════════════════════════════════════════════════════════════════
-- VaultSpark Studios — Achievements System
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- Achievements definition table
create table if not exists public.achievements (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text not null,
  icon        text not null default '🏆',
  points_reward int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Member achievements (earned)
create table if not exists public.member_achievements (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid not null references public.vault_members(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at      timestamptz not null default now(),
  unique(member_id, achievement_id)
);

-- RLS
alter table public.achievements enable row level security;
alter table public.member_achievements enable row level security;

-- Anyone can read achievements
create policy "achievements_public_read" on public.achievements
  for select using (true);

-- Members can read their own earned achievements
create policy "member_achievements_own_read" on public.member_achievements
  for select using (auth.uid() = member_id);

-- Only service role can insert (awarded server-side)
-- But allow members to read their own

-- Seed starter achievements
insert into public.achievements (slug, name, description, icon, points_reward) values
  ('first_login',       'First Spark',        'Logged into the Vault for the first time', '⚡', 10),
  ('reach_100_pts',     'Centurion',          'Earned 100 Vault Points', '💯', 25),
  ('reach_500_pts',     'Forge Guard',        'Earned 500 Vault Points', '🛡️', 50),
  ('reach_1500_pts',    'Vault Keeper',       'Earned 1,500 Vault Points', '🔐', 100),
  ('reach_5000_pts',    'The Sparked',        'Reached the top rank with 5,000 Vault Points', '✨', 250),
  ('first_challenge',   'Challenge Accepted', 'Completed your first community challenge', '🎯', 15),
  ('five_challenges',   'Challenge Streak',   'Completed 5 challenges total', '🔥', 50),
  ('vaultsparked',      'VaultSparked',       'Upgraded to VaultSparked premium membership', '💜', 100),
  ('referral_1',        'Vault Ambassador',   'Referred your first new member', '🤝', 100),
  ('referral_5',        'Vault Recruiter',    'Referred 5 new members', '📣', 250),
  ('play_3_games',      'Game Hopper',        'Played 3 different VaultSpark games', '🎮', 30),
  ('beta_tester',       'Beta Pioneer',       'Participated in a game beta test', '🔬', 75)
on conflict (slug) do nothing;

-- RPC: get member's achievements
create or replace function public.get_my_achievements()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return '[]'::jsonb; end if;

  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'slug', a.slug,
        'name', a.name,
        'description', a.description,
        'icon', a.icon,
        'points_reward', a.points_reward,
        'earned_at', ma.earned_at
      ) order by ma.earned_at desc
    ), '[]'::jsonb)
    from member_achievements ma
    join achievements a on a.id = ma.achievement_id
    where ma.member_id = v_uid
  );
end;
$$;

grant execute on function public.get_my_achievements() to authenticated;
