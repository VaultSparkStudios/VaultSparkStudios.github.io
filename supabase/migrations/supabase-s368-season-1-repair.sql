-- S368 — Season 1 repair (2026-10-02)
--
-- Live findings (read-only probe, 2026-10-02):
--   * award_season_xp() selected `WHERE is_active = true` and inserted into
--     season_xp(xp_earned, source). Neither column exists on public.seasons /
--     public.season_xp, so the function raised on every call. Three triggers call
--     it (game_scores, challenge_submissions, game_sessions), which means every
--     insert into those tables was rolled back: challenge_submissions has never
--     held a row.
--   * The only season row was "Vault Ignition" (2026-03-26 → 2026-06-30), still
--     active=true with a "Season 1 ends June 30" banner, while data/seasons.json
--     declares Season 1 — Ignition as 2026-09-02 → 2026-10-14.
--
-- This migration:
--   1. Rewrites award_season_xp() against the real schema and makes season
--      accounting unable to block the insert that triggered it.
--   2. Retires the stale Vault Ignition row and declares Season 1 — Ignition with
--      the window data/seasons.json already announced (no new public dates).
--   3. Gives the season recognition-only pass tiers. The announced rewards stay
--      the Vault Point rewards in data/seasons.json; nothing new is promised.
--   4. Backfills season XP from point_events earned inside the window.
--   5. Adds get_season_standings(): season XP ranking of public profiles, so new
--      members can compete on the season rather than on all-time points.
-- Idempotent: safe to re-run.

-- 1 ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_season_xp(p_user_id uuid, p_xp integer, p_source text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_season_id uuid;
BEGIN
  IF p_user_id IS NULL OR COALESCE(p_xp, 0) <= 0 THEN
    RETURN;
  END IF;

  SELECT id INTO v_season_id
    FROM seasons
   WHERE active = true AND now() BETWEEN start_at AND end_at
   ORDER BY start_at DESC
   LIMIT 1;

  IF v_season_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO season_xp (user_id, season_id, xp)
  VALUES (p_user_id, v_season_id, p_xp)
  ON CONFLICT (user_id, season_id)
  DO UPDATE SET xp = season_xp.xp + EXCLUDED.xp, updated_at = now();

  UPDATE vault_members
     SET season_xp = CASE WHEN current_season_id = v_season_id
                          THEN COALESCE(season_xp, 0) + p_xp
                          ELSE p_xp END,
         current_season_id = v_season_id
   WHERE id = p_user_id;
EXCEPTION WHEN OTHERS THEN
  -- Season accounting is a side effect. It must never roll back the score,
  -- session or challenge submission that called it.
  RAISE WARNING 'award_season_xp skipped (%): %', p_source, SQLERRM;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.award_season_xp(uuid, integer, text) FROM PUBLIC, anon, authenticated;

-- 2 ──────────────────────────────────────────────────────────────────────────
UPDATE public.seasons
   SET active = false,
       banner_text = 'Vault Ignition has closed.'
 WHERE slug = 'vault-ignition';

INSERT INTO public.seasons (name, slug, description, start_at, end_at, active, banner_text)
SELECT 'Season 1 — Ignition',
       'season-1-ignition',
       'The vault''s first competitive window: six weeks of ranked play, with Vault Point rewards for the top of the wall and for every member who completes a challenge.',
       '2026-09-02 00:00:00+00',
       '2026-10-14 00:00:00+00',
       true,
       'Season 1 ends October 14 — complete one challenge to earn the participant reward.'
WHERE NOT EXISTS (SELECT 1 FROM public.seasons WHERE slug = 'season-1-ignition');

UPDATE public.seasons
   SET active = true
 WHERE slug = 'season-1-ignition' AND now() < end_at;

-- 3 ──────────────────────────────────────────────────────────────────────────
WITH s AS (SELECT id FROM public.seasons WHERE slug = 'season-1-ignition')
INSERT INTO public.battle_pass_tiers (season_id, tier, xp_required, reward_label, reward_type)
SELECT s.id, t.tier, t.xp, t.label, t.kind
  FROM s,
       (VALUES (1,   100, 'Ignition — season badge',          'badge'),
               (2,   300, 'Ignited — season title',           'title'),
               (3,  1200, 'Cipher — season standing',         'badge'),
               (4,  4000, 'Champion — season standing',       'badge'),
               (5, 12000, 'Season Archon — permanent record', 'badge')) AS t(tier, xp, label, kind)
 WHERE NOT EXISTS (SELECT 1 FROM public.battle_pass_tiers b WHERE b.season_id = s.id);

-- 4 ──────────────────────────────────────────────────────────────────────────
WITH s AS (SELECT id, start_at, end_at FROM public.seasons WHERE slug = 'season-1-ignition'),
     earned AS (
       SELECT pe.user_id, s.id AS season_id, SUM(pe.points)::int AS xp
         FROM public.point_events pe, s
        WHERE pe.created_at >= s.start_at AND pe.created_at < s.end_at
          AND pe.points > 0
        GROUP BY pe.user_id, s.id)
INSERT INTO public.season_xp (user_id, season_id, xp)
SELECT user_id, season_id, xp FROM earned
ON CONFLICT (user_id, season_id) DO UPDATE SET xp = GREATEST(season_xp.xp, EXCLUDED.xp), updated_at = now();

UPDATE public.vault_members m
   SET season_xp = sx.xp, current_season_id = sx.season_id
  FROM public.season_xp sx
  JOIN public.seasons s ON s.id = sx.season_id AND s.slug = 'season-1-ignition'
 WHERE m.id = sx.user_id;

-- 5 ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_season_standings(p_limit integer DEFAULT 50)
RETURNS TABLE ("position" bigint, username text, points integer, season_xp integer, is_me boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH s AS (
    SELECT id FROM seasons
     WHERE active = true AND now() BETWEEN start_at AND end_at
     ORDER BY start_at DESC LIMIT 1)
  SELECT row_number() OVER (ORDER BY sx.xp DESC, m.username) AS "position",
         m.username,
         m.points,
         sx.xp AS season_xp,
         (m.id = auth.uid()) AS is_me
    FROM season_xp sx
    JOIN s ON s.id = sx.season_id
    JOIN vault_members m ON m.id = sx.user_id
   WHERE COALESCE(m.public_profile, true) OR m.id = auth.uid()
   ORDER BY sx.xp DESC, m.username
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
$function$;

GRANT EXECUTE ON FUNCTION public.get_season_standings(integer) TO anon, authenticated;
