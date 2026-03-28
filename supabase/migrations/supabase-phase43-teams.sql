-- ═══════════════════════════════════════════════════════════════════════════
-- VaultSpark Studios — Phase 43: teams + team_members
-- Run in Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── teams ────────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  invite_code  text        not null unique default upper(substring(md5(random()::text), 1, 6)),
  created_by   uuid        not null references auth.users(id) on delete cascade,
  total_points integer     not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_teams_points on public.teams(total_points desc);

alter table public.teams enable row level security;

-- Anyone can read teams (leaderboard)
drop policy if exists "teams_select_public" on public.teams;
create policy "teams_select_public"
  on public.teams for select to anon, authenticated using (true);

-- Authenticated can create a team
drop policy if exists "teams_insert_own" on public.teams;
create policy "teams_insert_own"
  on public.teams for insert to authenticated
  with check (auth.uid() = created_by);

-- Only the creator can update team name
drop policy if exists "teams_update_creator" on public.teams;
create policy "teams_update_creator"
  on public.teams for update to authenticated
  using (auth.uid() = created_by);

-- Only the creator can delete
drop policy if exists "teams_delete_creator" on public.teams;
create policy "teams_delete_creator"
  on public.teams for delete to authenticated
  using (auth.uid() = created_by);


-- ── team_members ─────────────────────────────────────────────────────────
create table if not exists public.team_members (
  id         uuid        primary key default gen_random_uuid(),
  team_id    uuid        not null references public.teams(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  role       text        not null default 'member' check (role in ('leader','member')),
  joined_at  timestamptz not null default now(),
  unique (user_id)  -- one team per member
);

create index if not exists idx_team_members_team on public.team_members(team_id);
create index if not exists idx_team_members_user on public.team_members(user_id);

alter table public.team_members enable row level security;

-- Anyone can read team membership (for roster display)
drop policy if exists "team_members_select_public" on public.team_members;
create policy "team_members_select_public"
  on public.team_members for select to anon, authenticated using (true);

-- Members can join a team (if they are not already in one -- enforced by UNIQUE)
drop policy if exists "team_members_insert_own" on public.team_members;
create policy "team_members_insert_own"
  on public.team_members for insert to authenticated
  with check (auth.uid() = user_id);

-- Members can leave (delete their own row)
drop policy if exists "team_members_delete_own" on public.team_members;
create policy "team_members_delete_own"
  on public.team_members for delete to authenticated
  using (auth.uid() = user_id);


-- ── Trigger: accumulate team points when a member earns points ───────────
create or replace function public.accrue_team_points()
returns trigger language plpgsql security definer as $$
begin
  update public.teams t
  set    total_points = t.total_points + new.points
  from   public.team_members tm
  where  tm.user_id = new.user_id
    and  tm.team_id = t.id;
  return new;
end;
$$;

create trigger trg_accrue_team_points
  after insert on public.point_events
  for each row execute function public.accrue_team_points();


-- ── Helper RPC: get my team with roster + vault_members usernames ─────────
create or replace function public.get_my_team()
returns jsonb language plpgsql security definer as $$
declare
  v_team_id uuid;
  v_team    jsonb;
  v_roster  jsonb;
begin
  select team_id into v_team_id
  from   public.team_members
  where  user_id = auth.uid()
  limit  1;

  if v_team_id is null then return null; end if;

  select row_to_json(t)::jsonb into v_team
  from   public.teams t
  where  t.id = v_team_id;

  select jsonb_agg(
    jsonb_build_object(
      'user_id',   tm.user_id,
      'role',      tm.role,
      'joined_at', tm.joined_at,
      'username',  coalesce(vm.username, 'vault_member')
    ) order by tm.joined_at
  ) into v_roster
  from   public.team_members tm
  left join public.vault_members vm on vm.id = tm.user_id
  where  tm.team_id = v_team_id;

  return jsonb_build_object('team', v_team, 'roster', coalesce(v_roster, '[]'::jsonb));
end;
$$;

grant execute on function public.get_my_team() to authenticated;
