-- ═══════════════════════════════════════════════════════════════════════════
-- S368 · definer-rpc-caller-trust
--
-- Database functions and tables that trusted the caller:
--   1. submit_weekly_score(p_user_id, …) — SECURITY DEFINER, never checked
--      auth.uid(): anyone could post a weekly score as any member.
--   2. get_following_feed(p_user_id, …) — SECURITY DEFINER: anyone could read
--      any member's follow feed, including activity of members who opted out
--      of public surfaces (vault_members.public_profile = false).
--   3. teams.invite_code and fan_art_votes.user_id are anon-readable. This file
--      adds column-restricted views the public pages can move to; the base-
--      table revokes that would break today's pages live in the follow-up file
--      supabase-s368-caller-trust-column-revokes.sql (apply after the pages
--      listed there stop selecting those columns).
--   4. Members could write their own challenge_streak / last_challenge_date /
--      rank_name. Challenge streaks now advance through record_challenge_streak()
--      (server-computed, requires a real completion today) and the column grants
--      are revoked. record_login_streak() is added for the daily-login streak; the
--      streak_count / last_login_date revoke is deferred to the follow-up file
--      because vault-member/portal-dashboard.js still writes them directly.
--   5. public_leaderboard gains username_lower so /member/?u= can use an exact
--      eq lookup instead of ilike (where % / _ / * acted as wildcards).
--
-- Both RPCs keep p_user_id in their signature so existing clients keep working;
-- the value is ignored unless it disagrees with auth.uid(), in which case the
-- call is refused. The service role may still act on behalf of p_user_id.
--
-- Idempotent: safe to re-run. Applied as one transaction by
-- scripts/apply-supabase-migration.mjs.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. submit_weekly_score: caller is auth.uid() ──────────────────────────
create or replace function public.submit_weekly_score(p_user_id uuid, p_game_slug text, p_score integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_username   text;
  v_points     integer;
  v_rank_title text;
  v_week_start date;
begin
  if auth.role() = 'service_role' then
    v_uid := p_user_id;                       -- trusted server-side caller
  elsif v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  elsif p_user_id is not null and p_user_id <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'user_mismatch');
  end if;

  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;
  if p_game_slug is null or p_game_slug !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_game_slug');
  end if;
  if p_score is null or p_score < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_score');
  end if;

  select username, points into v_username, v_points
    from vault_members where id = v_uid;
  if not found then return jsonb_build_object('ok', false, 'error', 'member_not_found'); end if;

  v_rank_title := case
    when v_points >= 100000 then 'The Sparked'
    when v_points >= 60000  then 'Forge Master'
    when v_points >= 30000  then 'Vault Keeper'
    when v_points >= 15000  then 'Void Operative'
    when v_points >= 7500   then 'Vault Breacher'
    when v_points >= 3000   then 'Vault Guard'
    when v_points >= 1000   then 'Rift Scout'
    when v_points >= 250    then 'Vault Runner'
    else 'Spark Initiate'
  end;

  v_week_start := date_trunc('week', now())::date;

  insert into weekly_game_scores (user_id, username, rank_title, game_slug, score, week_start)
  values (v_uid, v_username, v_rank_title, p_game_slug, p_score, v_week_start)
  on conflict (user_id, game_slug, week_start)
  do update set
    score      = greatest(weekly_game_scores.score, excluded.score),
    username   = excluded.username,
    rank_title = excluded.rank_title;

  return jsonb_build_object('ok', true, 'score', p_score, 'week_start', v_week_start);
end;
$$;

revoke all on function public.submit_weekly_score(uuid, text, integer) from public;
revoke execute on function public.submit_weekly_score(uuid, text, integer) from anon;
grant execute on function public.submit_weekly_score(uuid, text, integer) to authenticated;
grant execute on function public.submit_weekly_score(uuid, text, integer) to service_role;

-- ── 2. get_following_feed: caller is auth.uid(), opt-outs respected ───────
-- Built dynamically so the public_profile filter is only emitted where the
-- column exists (phase59); a SQL-language body is validated at create time.
do $do$
declare
  v_has_public_profile boolean := exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'vault_members' and column_name = 'public_profile'
  );
  v_profile_filter text := case when v_has_public_profile then 'and vm.public_profile = true' else '' end;
begin
  execute format($fn$
    create or replace function public.get_following_feed(p_user_id uuid, p_limit integer default 20)
    returns table(event_type text, username text, rank_title text, label text, created_at timestamptz)
    language sql
    stable
    security definer
    set search_path = public
    as $body$
      select
        'points'::text as event_type,
        vm.username,
        case
          when vm.points >= 100000 then 'The Sparked'
          when vm.points >= 60000  then 'Forge Master'
          when vm.points >= 30000  then 'Vault Keeper'
          when vm.points >= 15000  then 'Void Operative'
          when vm.points >= 7500   then 'Vault Breacher'
          when vm.points >= 3000   then 'Vault Guard'
          when vm.points >= 1000   then 'Rift Scout'
          when vm.points >= 250    then 'Vault Runner'
          else 'Spark Initiate'
        end as rank_title,
        pe.label,
        pe.created_at
      from point_events pe
      join vault_members vm on pe.user_id = vm.id
      where auth.uid() is not null
        and (p_user_id is null or p_user_id = auth.uid())
        and pe.user_id in (
          select following_id from member_follows where follower_id = auth.uid()
        )
        %s
        and pe.created_at > now() - interval '7 days'
      order by pe.created_at desc
      limit least(greatest(coalesce(p_limit, 20), 1), 50);
    $body$;
  $fn$, v_profile_filter);
end
$do$;

revoke all on function public.get_following_feed(uuid, integer) from public;
revoke execute on function public.get_following_feed(uuid, integer) from anon;
grant execute on function public.get_following_feed(uuid, integer) to authenticated;

-- ── 3. Column-restricted public views ─────────────────────────────────────
-- Owner-run views (security_invoker = false) expose only safe columns; the
-- public leaderboards / community page should read these instead of the base
-- tables. Base-table revokes: see supabase-s368-caller-trust-column-revokes.sql.
create or replace view public.teams_public with (security_invoker = false) as
  select id, name, total_points, created_at
    from public.teams;

grant select on public.teams_public to anon, authenticated;

create or replace view public.fan_art_vote_counts with (security_invoker = false) as
  select fan_art_id, count(*)::integer as vote_count
    from public.fan_art_votes
   group by fan_art_id;

grant select on public.fan_art_vote_counts to anon, authenticated;

-- ── 4. Progression columns move behind RPCs ───────────────────────────────
create or replace function public.record_challenge_streak()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_today  date := (now() at time zone 'utc')::date;
  v_last   date;
  v_streak integer;
  v_new    integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select challenge_streak, last_challenge_date into v_streak, v_last
    from vault_members where id = v_uid
    for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;

  -- A streak day only counts when a challenge was really completed today (UTC).
  if not exists (
    select 1 from challenge_completions
     where user_id = v_uid
       and completed_at >= (v_today::timestamp at time zone 'utc')
  ) then
    return jsonb_build_object('ok', false, 'error', 'no_completion_today',
                              'streak', coalesce(v_streak, 0), 'last_challenge_date', v_last);
  end if;

  if v_last = v_today then
    v_new := greatest(coalesce(v_streak, 1), 1);          -- already counted today
  elsif v_last = v_today - 1 then
    v_new := coalesce(v_streak, 0) + 1;
  else
    v_new := 1;
  end if;

  update vault_members
     set challenge_streak = v_new, last_challenge_date = v_today
   where id = v_uid;

  return jsonb_build_object('ok', true, 'streak', v_new, 'last_challenge_date', v_today,
                            'advanced', v_last is distinct from v_today);
end;
$$;

revoke all on function public.record_challenge_streak() from public;
revoke execute on function public.record_challenge_streak() from anon;
grant execute on function public.record_challenge_streak() to authenticated;

create or replace function public.record_login_streak()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_today  date := (now() at time zone 'utc')::date;
  v_last   date;
  v_streak integer;
  v_new    integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select streak_count, last_login_date into v_streak, v_last
    from vault_members where id = v_uid
    for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;

  if v_last = v_today then
    return jsonb_build_object('ok', true, 'streak', coalesce(v_streak, 0),
                              'last_login_date', v_today, 'already_today', true);
  end if;

  v_new := case when v_last = v_today - 1 then coalesce(v_streak, 0) + 1 else 1 end;

  update vault_members
     set streak_count = v_new, last_login_date = v_today
   where id = v_uid;

  return jsonb_build_object('ok', true, 'streak', v_new, 'last_login_date', v_today,
                            'already_today', false, 'was_consecutive', v_last = v_today - 1);
end;
$$;

revoke all on function public.record_login_streak() from public;
revoke execute on function public.record_login_streak() from anon;
grant execute on function public.record_login_streak() to authenticated;

-- Revoke member UPDATE on challenge streak + rank_name (no client writes
-- rank_name; challenge streak now goes through record_challenge_streak()).
-- Guarded: columns added via the dashboard may not exist on every environment.
do $$
declare
  c text;
begin
  foreach c in array array['challenge_streak', 'last_challenge_date', 'rank_name'] loop
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'vault_members' and column_name = c
    ) then
      execute format('revoke update (%I) on public.vault_members from authenticated', c);
      execute format('revoke update (%I) on public.vault_members from anon', c);
    end if;
  end loop;
end $$;

-- ── 5. public_leaderboard: append username_lower ──────────────────────────
-- Same projection phase61 built (only columns that exist, same order), with
-- username_lower appended last so CREATE OR REPLACE VIEW accepts it without a
-- drop (dependent objects stay valid). Opt-out filter unchanged.
do $$
declare
  wanted  text[] := array['id','username','points','created_at','member_number','is_sparked','avatar_emoji','accent','rank_name'];
  cols    text[] := array[]::text[];
  c       text;
begin
  foreach c in array wanted loop
    if exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'vault_members' and column_name = c) then
      cols := cols || quote_ident(c);
    end if;
  end loop;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'vault_members' and column_name = 'username_lower') then
    cols := cols || 'username_lower'::text;
  end if;
  begin
    execute format(
      'create or replace view public.public_leaderboard with (security_invoker = false) as select %s from public.vault_members where public_profile = true',
      array_to_string(cols, ', ')
    );
  exception when invalid_table_definition or feature_not_supported or duplicate_column then
    -- Live view drifted from the phase61 projection: rebuild it. A dependent
    -- object would make this drop fail and roll back the whole migration.
    execute 'drop view if exists public.public_leaderboard';
    execute format(
      'create view public.public_leaderboard with (security_invoker = false) as select %s from public.vault_members where public_profile = true',
      array_to_string(cols, ', ')
    );
  end;
end $$;

grant select on public.public_leaderboard to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Verification (read-only / rejected writes):
--   as anon:      select submit_weekly_score(gen_random_uuid(), 'x', 1);  → permission denied
--   as anon:      select * from get_following_feed(gen_random_uuid());   → permission denied
--   as member A:  select submit_weekly_score('<member B id>', 'x', 1);   → {"ok":false,"error":"user_mismatch"}
--   as member A:  select * from get_following_feed('<member B id>');     → 0 rows
--   as member:    update vault_members set challenge_streak = 99 where id = auth.uid(); → 42501
--   as anon:      select username_lower from public_leaderboard limit 1; → ok
--   as anon:      select * from teams_public limit 1;                     → no invite_code column
-- ══════════════════════════════════════════════════════════════════════
