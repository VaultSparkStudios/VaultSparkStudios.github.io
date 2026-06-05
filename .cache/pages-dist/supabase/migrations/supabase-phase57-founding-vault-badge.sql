-- ══════════════════════════════════════════════════════════════════════
-- Phase 57 — Founding Vault Member Badge (First 100)
-- ══════════════════════════════════════════════════════════════════════
-- Awards a special "Founding Vault Member" achievement badge to the
-- first 100 members who registered (by created_at).
--
-- The badge is permanently stamped and cannot be earned after the
-- first 100 spots are filled. It identifies the earliest builders
-- of the VaultSpark community.
-- ══════════════════════════════════════════════════════════════════════

-- 1. Insert the achievement definition (idempotent)
INSERT INTO public.achievements (slug, name, description, icon, points_reward)
VALUES (
  'founding_vault_member',
  'Founding Vault Member',
  'One of the first 100 members to join the VaultSpark Studios community. A permanent mark of being here before the vault was fully open.',
  '🏛️',
  500
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Award the achievement to the first 100 registered members
--    who don't already have it (safe to re-run — unique constraint prevents duplicates)
INSERT INTO public.member_achievements (member_id, achievement_id, earned_at)
SELECT
  vm.id            AS member_id,
  a.id             AS achievement_id,
  vm.created_at    AS earned_at       -- back-date to when they actually joined
FROM (
  SELECT id, created_at
  FROM public.vault_members
  ORDER BY created_at ASC
  LIMIT 100
) vm
CROSS JOIN (
  SELECT id FROM public.achievements WHERE slug = 'founding_vault_member'
) a
ON CONFLICT (member_id, achievement_id) DO NOTHING;

-- 3. Grant the first 100 members 500 bonus points via point_events
--    (only if they haven't received the founding bonus yet)
INSERT INTO public.point_events (user_id, reason, label, points)
SELECT
  vm.id,
  'founding_vault_member',
  'Founding Vault Member Badge',
  500
FROM (
  SELECT id
  FROM public.vault_members
  ORDER BY created_at ASC
  LIMIT 100
) vm
WHERE NOT EXISTS (
  SELECT 1 FROM public.point_events pe
  WHERE pe.user_id = vm.id
    AND pe.reason = 'founding_vault_member'
);

-- 4. Update vault_members points total to reflect the bonus
--    (only for those who received the point_event in this run)
UPDATE public.vault_members vm
SET points = vm.points + 500
WHERE vm.id IN (
  SELECT user_id FROM public.point_events
   WHERE reason = 'founding_vault_member'
)
AND NOT EXISTS (
  -- Don't double-count if the UPDATE was already applied
  -- (check via a sentinel in prefs JSON)
  SELECT 1 FROM public.vault_members v2
   WHERE v2.id = vm.id
     AND (v2.prefs->>'founding_bonus_applied') = 'true'
);

-- 5. Mark the bonus as applied in prefs so the UPDATE above is idempotent
UPDATE public.vault_members
SET prefs = prefs || '{"founding_bonus_applied": "true"}'::jsonb
WHERE id IN (
  SELECT user_id FROM public.point_events
   WHERE reason = 'founding_vault_member'
)
AND (prefs->>'founding_bonus_applied') IS NULL;

-- 6. Trigger (for future members if somehow the count hasn't hit 100 yet):
--    Auto-award the badge during register_open if total membership < 100.
--    This is handled via a DB function so the badge can be awarded in real-time.

CREATE OR REPLACE FUNCTION public.maybe_award_founding_badge(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rank          bigint;
  v_achievement   uuid;
BEGIN
  -- Rank this member by join order
  SELECT rank() OVER (ORDER BY created_at ASC)
  INTO v_rank
  FROM vault_members
  WHERE id = p_member_id;

  -- Only award if they're in the first 100
  IF v_rank <= 100 THEN
    SELECT id INTO v_achievement
      FROM achievements
     WHERE slug = 'founding_vault_member';

    IF v_achievement IS NOT NULL THEN
      INSERT INTO member_achievements (member_id, achievement_id, earned_at)
      VALUES (p_member_id, v_achievement, now())
      ON CONFLICT (member_id, achievement_id) DO NOTHING;

      -- Award points if not already awarded
      IF NOT EXISTS (
        SELECT 1 FROM point_events
         WHERE user_id = p_member_id AND reason = 'founding_vault_member'
      ) THEN
        INSERT INTO point_events (user_id, reason, label, points)
        VALUES (p_member_id, 'founding_vault_member', 'Founding Vault Member Badge', 500);

        UPDATE vault_members
           SET points = points + 500
         WHERE id = p_member_id;
      END IF;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.maybe_award_founding_badge(uuid) TO service_role;

-- ══════════════════════════════════════════════════════════════════════
-- Verification query (run after to confirm):
--   SELECT vm.username, vm.created_at, a.name, ma.earned_at
--   FROM vault_members vm
--   JOIN member_achievements ma ON ma.member_id = vm.id
--   JOIN achievements a ON a.id = ma.achievement_id
--   WHERE a.slug = 'founding_vault_member'
--   ORDER BY ma.earned_at ASC;
-- ══════════════════════════════════════════════════════════════════════
