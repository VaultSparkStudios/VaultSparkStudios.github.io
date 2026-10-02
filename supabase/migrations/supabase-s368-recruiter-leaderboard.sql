-- S368 — Recruiter leaderboard RPC (2026-10-02)
-- The /leaderboards/ Recruiters tab read point_events with the anon key, which RLS
-- limits to the caller's own rows, so the tab was permanently empty. This exposes
-- only aggregates (username, referral count, referral points) for public profiles.
-- Idempotent.

CREATE OR REPLACE FUNCTION public.get_recruiter_leaderboard(p_limit integer DEFAULT 25)
RETURNS TABLE (username text, referrals bigint, referral_points bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT m.username,
         count(*)              AS referrals,
         sum(pe.points)::bigint AS referral_points
    FROM point_events pe
    JOIN vault_members m ON m.id = pe.user_id
   WHERE pe.reason LIKE 'referral%'
     AND pe.points > 0
     AND COALESCE(m.public_profile, true)
   GROUP BY m.username
   ORDER BY count(*) DESC, sum(pe.points) DESC, m.username
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
$function$;

GRANT EXECUTE ON FUNCTION public.get_recruiter_leaderboard(integer) TO anon, authenticated;
