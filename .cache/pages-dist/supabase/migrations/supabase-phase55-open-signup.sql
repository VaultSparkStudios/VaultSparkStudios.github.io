-- Phase 55: Open Vault Member Signup
-- Replaces invite-required registration with open free-tier signup.
-- Invite codes remain optional — using one awards +50 XP to the new member
-- and +100 XP to the inviter (same as before).

-- ── register_open ──────────────────────────────────────────────────────────
-- Called by portal-auth.js when the user signs up without (or with) an invite.
-- If p_invite_code is non-empty it is validated and redeemed.
-- If p_invite_code is empty the account is created on the free tier with
-- 10 starter points (same as the invite path).

CREATE OR REPLACE FUNCTION public.register_open(
  p_username    text,
  p_subscribe   boolean DEFAULT true,
  p_invite_code text    DEFAULT ''
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
  v_starter_pts  int    := 10;
  v_referral_cnt int;
BEGIN
  -- Must be authenticated (Supabase auth.signUp creates the user first)
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

    -- Code is valid — bonus XP for new member
    v_starter_pts := 60; -- 10 base + 50 invite bonus
  END IF;

  -- ── Create vault_members row ───────────────────────────────────
  INSERT INTO vault_members (
    id, username, username_lower, points, subscribed, prefs, achievements
  ) VALUES (
    v_user_id,
    trim(p_username),
    v_lower,
    v_starter_pts,
    p_subscribe,
    jsonb_build_object('updates', p_subscribe, 'lore', true, 'access', true),
    '[{"id":"joined"}]'::jsonb
  );

  -- ── Redeem invite code (if provided) ──────────────────────────
  IF v_code_present THEN
    UPDATE invite_codes
       SET used = true, used_by = v_user_id, used_at = now()
     WHERE code = upper(trim(p_invite_code));

    -- Referral rewards to inviter
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

      -- Recruiter achievement (1st referral)
      IF v_referral_cnt >= 1 THEN
        UPDATE vault_members
           SET achievements = achievements || '[{"id":"recruiter"}]'::jsonb
         WHERE id = v_code_row.created_by
           AND NOT (achievements @> '[{"id":"recruiter"}]'::jsonb);
      END IF;

      -- Patron achievement (5 referrals)
      IF v_referral_cnt >= 5 THEN
        UPDATE vault_members
           SET achievements = achievements || '[{"id":"patron"}]'::jsonb
         WHERE id = v_code_row.created_by
           AND NOT (achievements @> '[{"id":"patron"}]'::jsonb);
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok',           true,
    'starter_pts',  v_starter_pts,
    'used_invite',  v_code_present
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_open(text, boolean, text)
  TO authenticated;
