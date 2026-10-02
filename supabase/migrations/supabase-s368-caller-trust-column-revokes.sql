-- ═══════════════════════════════════════════════════════════════════════════
-- S368 · definer-rpc-caller-trust — FOLLOW-UP (apply only after the client
-- changes listed below have shipped; applying it first breaks those pages).
--
-- Depends on: supabase-s368-caller-trust.sql (views teams_public,
-- fan_art_vote_counts and RPC record_login_streak must exist).
--
-- Client callers that must change first (anonymous reads of these columns
-- become permission errors once this file is applied):
--   teams.invite_code (anon):
--     leaderboards/index.html, leaderboards/weekly/, teams/, recruiters/,
--     football-gm/, challenges/, call-of-doodie/  —
--       /rest/v1/teams?select=id,name,invite_code,total_points  → read
--       /rest/v1/teams_public?select=id,name,total_points instead.
--   fan_art_votes.user_id (anon):
--     community/index.html —
--       /rest/v1/fan_art_votes?fan_art_id=in.(…)&select=fan_art_id,user_id
--       → counts from /rest/v1/fan_art_vote_counts; the signed-in member's own
--       vote check (fan_art_id=eq.…&user_id=eq.<own id>) keeps working because
--       authenticated members may still read their OWN vote rows.
--   vault_members.streak_count / last_login_date (authenticated UPDATE):
--     vault-member/portal-dashboard.js checkDailyLogin() — replace the direct
--       .update({ last_login_date, streak_count }) with
--       VSSupabase.rpc('record_login_streak') and read { streak, already_today }.
--   (vault-member/portal-dashboard.js joinTeam also reads teams by invite_code
--    as an authenticated member; that keeps working — authenticated keeps the
--    column — but a join_team_by_code RPC would let it be revoked there too.)
--
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── teams: anon may no longer read invite_code ────────────────────────────
-- A column REVOKE is a no-op while a table-level SELECT grant exists, so the
-- table grant is replaced by column grants that omit invite_code.
revoke select on public.teams from anon;
do $$
declare
  c text;
  cols text[] := array[]::text[];
begin
  foreach c in array array['id', 'name', 'created_by', 'total_points', 'created_at'] loop
    if exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'teams' and column_name = c) then
      cols := cols || quote_ident(c);
    end if;
  end loop;
  if array_length(cols, 1) > 0 then
    execute format('grant select (%s) on public.teams to anon', array_to_string(cols, ', '));
  end if;
end $$;

-- ── fan_art_votes: votes are no longer an anonymous member-id feed ────────
drop policy if exists "fan_art_votes_select_public" on public.fan_art_votes;
drop policy if exists "fan_art_votes_select_own" on public.fan_art_votes;
create policy "fan_art_votes_select_own"
  on public.fan_art_votes for select
  to authenticated
  using (auth.uid() = user_id);
revoke select on public.fan_art_votes from anon;

-- ── vault_members: daily-login streak moves behind record_login_streak() ──
do $$
declare
  c text;
begin
  foreach c in array array['streak_count', 'last_login_date'] loop
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'vault_members' and column_name = c
    ) then
      execute format('revoke update (%I) on public.vault_members from authenticated', c);
      execute format('revoke update (%I) on public.vault_members from anon', c);
    end if;
  end loop;
end $$;

-- Verification (as anon):
--   GET /rest/v1/teams?select=invite_code&limit=1          → 401 permission denied for column
--   GET /rest/v1/teams?select=id,name,total_points&limit=1 → rows
--   GET /rest/v1/fan_art_votes?select=user_id&limit=1      → permission denied
--   GET /rest/v1/fan_art_vote_counts?limit=1               → rows
