-- ══════════════════════════════════════════════════════════════════════
-- Phase 58 — Genesis Vault Member (rename from Founding Vault Member)
-- ══════════════════════════════════════════════════════════════════════
-- Renames the achievement to "Genesis Vault Member" (avoiding legal
-- ambiguity of "Founding/Founder"), updates the icon to a custom SVG,
-- and updates the award function to exclude studio owner accounts from
-- the 100-slot count (they keep the badge; real public members fill the slots).
-- ══════════════════════════════════════════════════════════════════════

-- Studio owner account UUIDs (excluded from the 100 public slots)
-- These accounts already hold the badge; they do not consume a slot.
-- DreadSpike / OneKingdom / VaultSpark / Voidfall
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'studio_owner_ids') THEN
    NULL; -- no type needed, just using a constant CTE below
  END IF;
END $$;

-- 1. Rename and update the achievement definition
UPDATE public.achievements
SET
  slug        = 'genesis_vault_member',
  name        = 'Genesis Vault Member',
  description = 'One of the first 100 members to join the VaultSpark Studios community. A permanent mark of being here before the vault was fully open.',
  icon        = '/assets/images/badges/genesis-vault-member.svg'
WHERE slug = 'founding_vault_member';

-- 2. Update point_events reason label to match new slug
--    (keeps historical records consistent)
UPDATE public.point_events
SET reason = 'genesis_vault_member'
WHERE reason = 'founding_vault_member';

-- 3. Update the prefs sentinel key
--    (idempotent guard used in phase57 points UPDATE)
UPDATE public.vault_members
SET prefs = (prefs - 'founding_bonus_applied') || '{"genesis_bonus_applied": "true"}'::jsonb
WHERE (prefs->>'founding_bonus_applied') = 'true'
  AND (prefs->>'genesis_bonus_applied') IS NULL;

-- 4. Drop old function and create renamed version
--    that excludes studio owner accounts from slot count
DROP FUNCTION IF EXISTS public.maybe_award_founding_badge(uuid);

CREATE OR REPLACE FUNCTION public.maybe_award_genesis_badge(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Studio owner UUIDs: excluded from the public 100-slot count
  -- They receive the badge separately; these slots belong to public members.
  v_studio_ids  uuid[] := ARRAY[
    '36c3cbf3-c192-4540-8d0e-d65eefbcddce'::uuid,  -- DreadSpike
    'cb9b061f-ddcc-498a-a7bf-728c7c6f8340'::uuid,  -- OneKingdom
    'c5c1be48-e639-45f7-8b35-c28fb0d3be44'::uuid,  -- VaultSpark
    'e8a18737-4a56-460f-80d2-6f45c5272747'::uuid   -- Voidfall
  ];
  v_rank        bigint;
  v_achievement uuid;
BEGIN
  -- If this is a studio owner account, award the badge unconditionally
  -- (they already have it from phase57, ON CONFLICT handles idempotency)
  IF p_member_id = ANY(v_studio_ids) THEN
    SELECT id INTO v_achievement FROM achievements WHERE slug = 'genesis_vault_member';
    IF v_achievement IS NOT NULL THEN
      INSERT INTO member_achievements (member_id, achievement_id, earned_at)
      VALUES (p_member_id, v_achievement, now())
      ON CONFLICT (member_id, achievement_id) DO NOTHING;
    END IF;
    RETURN;
  END IF;

  -- For public members: rank among non-studio accounts only
  SELECT COUNT(*) + 1
  INTO v_rank
  FROM vault_members
  WHERE created_at < (SELECT created_at FROM vault_members WHERE id = p_member_id)
    AND id <> ALL(v_studio_ids);

  -- Only award if they're within the first 100 public slots
  IF v_rank <= 100 THEN
    SELECT id INTO v_achievement FROM achievements WHERE slug = 'genesis_vault_member';

    IF v_achievement IS NOT NULL THEN
      INSERT INTO member_achievements (member_id, achievement_id, earned_at)
      VALUES (p_member_id, v_achievement, now())
      ON CONFLICT (member_id, achievement_id) DO NOTHING;

      -- Award points if not already awarded
      IF NOT EXISTS (
        SELECT 1 FROM point_events
         WHERE user_id = p_member_id AND reason = 'genesis_vault_member'
      ) THEN
        INSERT INTO point_events (user_id, reason, label, points)
        VALUES (p_member_id, 'genesis_vault_member', 'Genesis Vault Member Badge', 500);

        UPDATE vault_members
           SET points = points + 500,
               prefs  = prefs || '{"genesis_bonus_applied": "true"}'::jsonb
         WHERE id = p_member_id;
      END IF;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.maybe_award_genesis_badge(uuid) TO service_role;

-- ══════════════════════════════════════════════════════════════════════
-- Verification queries:
--
--   -- Confirm achievement renamed:
--   SELECT slug, name, icon FROM achievements WHERE slug = 'genesis_vault_member';
--
--   -- Confirm all 4 studio owners still have badge:
--   SELECT vm.username, a.name, ma.earned_at
--   FROM vault_members vm
--   JOIN member_achievements ma ON ma.member_id = vm.id
--   JOIN achievements a ON a.id = ma.achievement_id
--   WHERE a.slug = 'genesis_vault_member'
--   ORDER BY ma.earned_at;
--
--   -- Confirm 0 public slots consumed (all 100 still open):
--   SELECT COUNT(*) FROM member_achievements ma
--   JOIN achievements a ON a.id = ma.achievement_id
--   JOIN vault_members vm ON vm.id = ma.member_id
--   WHERE a.slug = 'genesis_vault_member'
--     AND vm.id NOT IN (
--       '36c3cbf3-c192-4540-8d0e-d65eefbcddce',
--       'cb9b061f-ddcc-498a-a7bf-728c7c6f8340',
--       'c5c1be48-e639-45f7-8b35-c28fb0d3be44',
--       'e8a18737-4a56-460f-80d2-6f45c5272747'
--     );
-- ══════════════════════════════════════════════════════════════════════
