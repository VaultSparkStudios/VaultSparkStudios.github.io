-- ══════════════════════════════════════════════════════════════════════
-- Phase 56 — Referral Attribution via username link (?ref=username)
-- ══════════════════════════════════════════════════════════════════════
-- Adds p_ref_by param to register_open so that when a new member signs
-- up via a referral link (/vault-member/?ref=username), the referrer
-- gets +100 XP and milestone progress — same rewards as the invite-code
-- path. invite_code takes precedence if both are supplied.
--
-- Also adds referred_by column to vault_members for attribution tracking,
-- and updates get_referral_milestones to count both referral paths.
-- ══════════════════════════════════════════════════════════════════════

-- 1. Track direct referrals on the member row
ALTER TABLE public.vault_members
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 2. register_open — adds p_ref_by ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.register_open(
  p_username    text,
  p_subscribe   boolean DEFAULT true,
  p_invite_code text    DEFAULT '',
  p_ref_by      text    DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid   := auth.uid();
  v_lower        text   := lower(trim(p_username));
  v_code_row     invite_codes%ROWTYPE;
  v_code_present boolean := length(trim(coalesce(p_invite_code, ''))) > 0;
  v_ref_present  boolean := length(trim(coalesce(p_ref_by, ''))) > 0
                             AND NOT (length(trim(coalesce(p_invite_code, ''))) > 0); -- invite code takes precedence
  v_referrer_id  uuid;
  v_referrer_lower text := lower(trim(coalesce(p_ref_by, '')));
  v_starter_pts  int    := 10;
  v_referral_cnt int;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  -- Username uniqueness
  IF EXISTS (SELECT 1 FROM vault_members WHERE username_lower = v_lower) THEN
    RETURN jsonb_build_object('error', 'That Vault Handle is already taken.');
  END IF;

  -- ── Optional invite code validation ──────────────────────────
  IF v_code_present THEN
    SELECT * INTO v_code_row
      FROM invite_codes
     WHERE code = upper(trim(p_invite_code));

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Invalid invite code.');
    END IF;

    IF v_code_row.used THEN
      RETURN jsonb_build_object('error', 'Invite code has already been used.');
    END IF;

    v_starter_pts := 60; -- 10 base + 50 invite bonus
  END IF;

  -- ── Resolve referrer by username (only when no invite code) ──
  IF v_ref_present THEN
    SELECT id INTO v_referrer_id
      FROM vault_members
     WHERE username_lower = v_referrer_lower
       AND id != v_user_id
     LIMIT 1;
    -- Silently ignore unknown or self-referral usernames
  END IF;

  -- ── Create vault_members row ───────────────────────────────────
  INSERT INTO vault_members (
    id, username, username_lower, points, subscribed, prefs, achievements, referred_by
  ) VALUES (
    v_user_id,
    trim(p_username),
    v_lower,
    v_starter_pts,
    p_subscribe,
    jsonb_build_object('updates', p_subscribe, 'lore', true, 'access', true),
    '[{"id":"joined"}]'::jsonb,
    CASE WHEN v_ref_present AND v_referrer_id IS NOT NULL THEN v_referrer_id ELSE NULL END
  );

  -- ── Redeem invite code (if provided) ──────────────────────────
  IF v_code_present THEN
    UPDATE invite_codes
       SET used = true, used_by = v_user_id, used_at = now()
     WHERE code = upper(trim(p_invite_code));

    IF v_code_row.created_by IS NOT NULL
       AND v_code_row.created_by != v_user_id THEN

      INSERT INTO point_events (user_id, reason, label, points)
      VALUES (
        v_code_row.created_by,
        'referral_' || v_user_id::text,
        'Vault Referral',
        100
      );

      UPDATE vault_members
         SET points = points + 100
       WHERE id = v_code_row.created_by;

      SELECT count(*) INTO v_referral_cnt
        FROM invite_codes
       WHERE created_by = v_code_row.created_by AND used = true;

      IF v_referral_cnt >= 1 THEN
        UPDATE vault_members
           SET achievements = achievements || '[{"id":"recruiter"}]'::jsonb
         WHERE id = v_code_row.created_by
           AND NOT (achievements @> '[{"id":"recruiter"}]'::jsonb);
      END IF;

      IF v_referral_cnt >= 5 THEN
        UPDATE vault_members
           SET achievements = achievements || '[{"id":"patron"}]'::jsonb
         WHERE id = v_code_row.created_by
           AND NOT (achievements @> '[{"id":"patron"}]'::jsonb);
      END IF;
    END IF;
  END IF;

  -- ── Award referrer (username link path) ───────────────────────
  IF v_ref_present AND v_referrer_id IS NOT NULL THEN

    INSERT INTO point_events (user_id, reason, label, points)
    VALUES (
      v_referrer_id,
      'referral_link_' || v_user_id::text,
      'Vault Referral Link',
      100
    );

    UPDATE vault_members
       SET points = points + 100
     WHERE id = v_referrer_id;

    -- Count total referrals for this referrer (both paths)
    SELECT (
      SELECT count(*) FROM invite_codes
       WHERE created_by = v_referrer_id AND used = true
    ) + (
      SELECT count(*) FROM vault_members
       WHERE referred_by = v_referrer_id
    ) INTO v_referral_cnt;

    IF v_referral_cnt >= 1 THEN
      UPDATE vault_members
         SET achievements = achievements || '[{"id":"recruiter"}]'::jsonb
       WHERE id = v_referrer_id
         AND NOT (achievements @> '[{"id":"recruiter"}]'::jsonb);
    END IF;

    IF v_referral_cnt >= 5 THEN
      UPDATE vault_members
         SET achievements = achievements || '[{"id":"patron"}]'::jsonb
       WHERE id = v_referrer_id
         AND NOT (achievements @> '[{"id":"patron"}]'::jsonb);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok',           true,
    'starter_pts',  v_starter_pts,
    'used_invite',  v_code_present,
    'used_ref_by',  v_ref_present AND v_referrer_id IS NOT NULL
  );
END;
$$;

-- Revoke old 3-param grant, add new 4-param grant
REVOKE EXECUTE ON FUNCTION public.register_open(text, boolean, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.register_open(text, boolean, text, text) TO authenticated;

-- ── 3. get_referral_milestones — count both referral paths ──────────
CREATE OR REPLACE FUNCTION public.get_referral_milestones(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_referral_count int;
  v_milestones     json;
BEGIN
  -- Count referrals across both paths (invite codes + direct username links)
  SELECT (
    SELECT count(*) FROM public.invite_codes
     WHERE created_by = p_user_id AND used_by IS NOT NULL
  ) + (
    SELECT count(*) FROM public.vault_members
     WHERE referred_by = p_user_id
  ) INTO v_referral_count;

  SELECT json_agg(row_to_json(t) ORDER BY t.threshold) INTO v_milestones
  FROM (
    SELECT
      rm.id,
      rm.threshold,
      rm.reward_type,
      rm.reward_value,
      rm.label,
      rm.description,
      rm.icon,
      EXISTS(
        SELECT 1 FROM public.vault_member_milestones vmm
         WHERE vmm.member_id = p_user_id AND vmm.milestone_id = rm.id
      ) AS claimed
    FROM public.referral_milestones rm
  ) t;

  RETURN json_build_object(
    'referral_count', v_referral_count,
    'milestones',     coalesce(v_milestones, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
