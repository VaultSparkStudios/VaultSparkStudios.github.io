-- 20261117_point_award_integrity.sql
--
-- Closes three point-integrity gaps measured on the live project on 2026-11-17:
--
--   1. award_points(p_reason, p_points, …) trusted the caller for the amount,
--      the reason and the dedup window. Any signed-in member could credit
--      themselves any number of points.
--   2. award_vault_points(p_user_id, …, p_points, …) had no caller check and was
--      executable by anon: any visitor could credit any member.
--   3. submit_game_score() calls award_points(uuid, integer, text, text). That
--      overload did not exist, so crossing a score milestone raised an error.
--
-- After this migration the client still calls award_points with the same four
-- named arguments, but the amount and the window come from point_award_rules.
-- p_points and p_once_per are accepted for compatibility and ignored.
--
-- Idempotent. Rollback: the pre-image captured by apply-supabase-migration.mjs.

-- ── 1. Rule table: the only source of self-claimable point values ──────────
create table if not exists public.point_award_rules (
  reason_pattern text primary key,
  points         integer not null check (points between 0 and 1000),
  once_per       text    not null check (once_per in ('ever', 'day', 'year')),
  note           text
);

alter table public.point_award_rules enable row level security;
revoke all on table public.point_award_rules from public, anon, authenticated;
grant select, insert, update, delete on table public.point_award_rules to service_role;

insert into public.point_award_rules (reason_pattern, points, once_per, note) values
  ('daily_login',            10,   'day',  'Portal visit, once per UTC day'),
  ('streak_milestone_7',     50,   'ever', 'Login streak milestone'),
  ('streak_milestone_14',    100,  'ever', 'Login streak milestone'),
  ('streak_milestone_30',    200,  'ever', 'Login streak milestone'),
  ('streak_milestone_60',    500,  'ever', 'Login streak milestone'),
  ('streak_milestone_100',   1000, 'ever', 'Login streak milestone'),
  ('game_visit_cod',         10,   'ever', 'First visit to a game page'),
  ('game_visit_gridiron',    10,   'ever', 'First visit to a game page'),
  ('game_visit_vsfgm',       10,   'ever', 'First visit to a game page'),
  ('lore_read_dreadspike',   15,   'ever', 'Read a lore file'),
  ('gs_cod_5',               25,   'ever', 'Game session milestone'),
  ('gs_cod_10',              50,   'ever', 'Game session milestone'),
  ('gs_cod_25',              100,  'ever', 'Game session milestone'),
  ('gs_ggm_5',               25,   'ever', 'Game session milestone'),
  ('gs_ggm_10',              50,   'ever', 'Game session milestone'),
  ('gs_ggm_25',              100,  'ever', 'Game session milestone'),
  ('gs_vsfgm_5',             25,   'ever', 'Game session milestone'),
  ('gs_vsfgm_10',            50,   'ever', 'Game session milestone'),
  ('gs_vsfgm_25',            100,  'ever', 'Game session milestone'),
  ('challenge_streak_7',     50,   'day',  'Challenge streak bonus'),
  ('challenge_streak_30',    200,  'day',  'Challenge streak bonus'),
  ('first_challenge',        25,   'ever', 'Challenge count milestone'),
  ('challenge_5',            25,   'ever', 'Challenge count milestone'),
  ('challenge_10',           25,   'ever', 'Challenge count milestone'),
  ('file_read_*',            20,   'ever', 'Read a classified file; slug must exist'),
  ('anniversary',            0,    'year', '50 points per full membership year, computed here')
on conflict (reason_pattern) do update
  set points = excluded.points, once_per = excluded.once_per, note = excluded.note;

-- ── 2. Client entry point: caller-chosen amounts are ignored ───────────────
create or replace function public.award_points(
  p_reason   text,
  p_points   integer default null,
  p_label    text    default null,
  p_once_per text    default 'ever'
)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_rule    public.point_award_rules%rowtype;
  v_points  integer;
  v_since   timestamptz;
  v_today   integer;
  v_joined  timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;
  if p_reason is null or length(p_reason) = 0 or length(p_reason) > 80 then
    return jsonb_build_object('error', 'reason_not_allowed');
  end if;

  select * into v_rule from public.point_award_rules where reason_pattern = p_reason;
  if v_rule.reason_pattern is null and left(p_reason, 10) = 'file_read_' then
    if exists (select 1 from public.classified_files where slug = substr(p_reason, 11)) then
      select * into v_rule from public.point_award_rules where reason_pattern = 'file_read_*';
    end if;
  end if;
  if v_rule.reason_pattern is null then
    return jsonb_build_object('error', 'reason_not_allowed');
  end if;

  -- One award decision at a time per member, so two tabs cannot both pass
  -- the dedup check.
  perform pg_advisory_xact_lock(hashtextextended('award_points:' || v_uid::text, 0));

  select created_at into v_joined from public.vault_members where id = v_uid;
  if not found then
    return jsonb_build_object('error', 'member_not_found');
  end if;

  v_points := v_rule.points;
  if p_reason = 'anniversary' then
    v_points := 50 * floor(extract(epoch from (now() - v_joined)) / 31557600)::integer;
    if v_points <= 0 then
      return jsonb_build_object('skipped', true);
    end if;
    v_points := least(v_points, 1000);
  end if;

  v_since := case v_rule.once_per
    when 'day'  then date_trunc('day',  now())
    when 'year' then date_trunc('year', now())
    else '-infinity'::timestamptz
  end;

  if exists (
    select 1 from public.point_events
     where user_id = v_uid and reason = p_reason and created_at >= v_since
  ) then
    return jsonb_build_object('skipped', true);
  end if;

  -- Ceiling on self-claimed points per UTC day, independent of the rules.
  select coalesce(sum(points), 0) into v_today
    from public.point_events
   where user_id = v_uid and points > 0 and created_at >= date_trunc('day', now());
  if v_today + v_points > 2500 then
    return jsonb_build_object('error', 'daily_limit');
  end if;

  insert into public.point_events (user_id, reason, label, points)
  values (v_uid, p_reason, left(coalesce(nullif(p_label, ''), p_reason), 120), v_points);

  update public.vault_members set points = points + v_points where id = v_uid;

  return jsonb_build_object('ok', true, 'points', v_points);
end;
$$;

revoke all on function public.award_points(text, integer, text, text) from public, anon;
grant execute on function public.award_points(text, integer, text, text) to authenticated, service_role;

-- ── 3. Internal overload used by submit_game_score() ───────────────────────
-- Trusted server-side callers only: never granted to anon or authenticated.
create or replace function public.award_points(
  p_user_id uuid,
  p_points  integer,
  p_reason  text,
  p_label   text
)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null or p_points is null or p_points <= 0 or p_points > 1000
     or p_reason is null or length(p_reason) > 120 then
    return jsonb_build_object('error', 'invalid_award');
  end if;
  if exists (select 1 from public.point_events where user_id = p_user_id and reason = p_reason) then
    return jsonb_build_object('skipped', true);
  end if;
  insert into public.point_events (user_id, reason, label, points)
  values (p_user_id, p_reason, left(coalesce(nullif(p_label, ''), p_reason), 120), p_points);
  update public.vault_members set points = points + p_points where id = p_user_id;
  return jsonb_build_object('ok', true, 'points', p_points);
end;
$$;

revoke all on function public.award_points(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.award_points(uuid, integer, text, text) to service_role;

-- ── 4. Service-only point writers lose their public grants ─────────────────
revoke all on function public.award_vault_points(uuid, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.award_vault_points(uuid, text, integer, jsonb) to service_role;

revoke all on function public.award_points_for_user(uuid, text, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.award_points_for_user(uuid, text, integer, text, text, text) to service_role;
