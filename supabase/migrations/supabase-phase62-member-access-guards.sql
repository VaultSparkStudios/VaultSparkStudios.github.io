-- Reserve the Studio handle during open registration and restrict member
-- statistics to the authenticated member's own account.
-- CREATE OR REPLACE preserves the existing function owners and grants.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_member_stats(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_member      public.vault_members%rowtype;
  v_calc_count  bigint;
  v_ledger_count bigint;
  v_sub_status  text := 'inactive';
  v_game_count  bigint;
begin
  -- S413 proposed guard: enriched member statistics are caller-owned.
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    return jsonb_build_object('error', 'Not authorized');
  end if;

  select * into v_member from public.vault_members where id = p_user_id;
  if not found then return jsonb_build_object('error', 'Not found'); end if;

  select count(*) into v_calc_count
  from public.vault_events where user_id = p_user_id and event_type = 'calculation';

  select count(*) into v_ledger_count
  from public.vault_events where user_id = p_user_id and event_type = 'ledger_entry';

  select status into v_sub_status
  from public.subscriptions where user_id = p_user_id;

  select count(distinct game_slug) into v_game_count
  from public.game_sessions where user_id = p_user_id;

  return jsonb_build_object(
    'points',          v_member.points,
    'achievements',    v_member.achievements,
    'calc_count',      v_calc_count,
    'ledger_count',    v_ledger_count,
    'sub_status',      coalesce(v_sub_status, 'inactive'),
    'game_count',      v_game_count,
    'created_at',      v_member.created_at
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.register_open(p_username text, p_subscribe boolean DEFAULT true, p_invite_code text DEFAULT ''::text, p_ref_by text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- S413 proposed guard: reserve the existing admin handle on new registration.
  IF v_lower = 'vaultspark' THEN
    RETURN jsonb_build_object('error', 'That Vault Handle is reserved.');
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
$function$;

COMMIT;
