-- ============================================================
-- Phase 54 — Three-Tier Membership System
-- VaultSparked + VaultSparked Pro with grandfather pricing
-- ============================================================

-- ── 1. ALTER subscriptions ──────────────────────────────────

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_price_id   TEXT,
  ADD COLUMN IF NOT EXISTS enrolled_phase    SMALLINT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_monthly_xp_at TIMESTAMPTZ;

-- Drop old plan check constraint if it exists, then add updated one
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscriptions_plan_check'
      AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_plan_check;
  END IF;
END
$$;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'vault_sparked', 'vault_sparked_pro', 'promogrind_pro'));

-- ── 2. ALTER vault_members ──────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vault_members' AND column_name = 'plan_key'
  ) THEN
    ALTER TABLE vault_members
      ADD COLUMN plan_key TEXT NOT NULL DEFAULT 'free';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vault_members_plan_key_check'
      AND table_name = 'vault_members'
  ) THEN
    ALTER TABLE vault_members DROP CONSTRAINT vault_members_plan_key_check;
  END IF;
END
$$;

ALTER TABLE vault_members
  ADD CONSTRAINT vault_members_plan_key_check
  CHECK (plan_key IN ('free', 'vault_sparked', 'vault_sparked_pro', 'promogrind_pro'));

-- ── 3. CREATE membership_phases ─────────────────────────────

CREATE TABLE IF NOT EXISTS membership_phases (
  id                BIGSERIAL PRIMARY KEY,
  plan_key          TEXT NOT NULL,
  phase             SMALLINT NOT NULL,
  price_label       TEXT NOT NULL,
  stripe_price_id   TEXT NOT NULL,
  subscriber_cap    INT,               -- NULL = unlimited
  subscriber_count  INT NOT NULL DEFAULT 0,
  is_current        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_key, phase)
);

-- RLS
ALTER TABLE membership_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read membership_phases" ON membership_phases;
CREATE POLICY "Public read membership_phases"
  ON membership_phases FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role all membership_phases" ON membership_phases;
CREATE POLICY "Service role all membership_phases"
  ON membership_phases FOR ALL
  USING (auth.role() = 'service_role');

-- Seed rows (use IF NOT EXISTS pattern via INSERT ON CONFLICT DO NOTHING)
INSERT INTO membership_phases (plan_key, phase, price_label, stripe_price_id, subscriber_cap, subscriber_count, is_current)
VALUES
  ('vault_sparked',     1, '$4.99/mo',  'price_SPARKED_P1_REPLACE_ME',  500,  0, TRUE),
  ('vault_sparked',     2, '$9.99/mo',  'price_SPARKED_P2_REPLACE_ME',  1000, 0, FALSE),
  ('vault_sparked',     3, '$14.99/mo', 'price_SPARKED_P3_REPLACE_ME',  NULL, 0, FALSE),
  ('vault_sparked_pro', 1, '$29.99/mo', 'price_PRO_P1_REPLACE_ME',      100,  0, TRUE),
  ('vault_sparked_pro', 2, '$49.99/mo', 'price_PRO_P2_REPLACE_ME',      200,  0, FALSE),
  ('vault_sparked_pro', 3, '$99.99/mo', 'price_PRO_P3_REPLACE_ME',      NULL, 0, FALSE)
ON CONFLICT (plan_key, phase) DO NOTHING;

-- ── 4. FUNCTION reserve_phase_slot ──────────────────────────

CREATE OR REPLACE FUNCTION reserve_phase_slot(p_plan_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row        membership_phases%ROWTYPE;
  v_new_count  INT;
BEGIN
  -- Lock the current phase row for this plan
  SELECT * INTO v_row
  FROM membership_phases
  WHERE plan_key = p_plan_key
    AND is_current = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_current_phase');
  END IF;

  -- Increment subscriber count
  v_new_count := v_row.subscriber_count + 1;

  UPDATE membership_phases
  SET subscriber_count = v_new_count
  WHERE id = v_row.id;

  -- If cap reached, advance to next phase
  IF v_row.subscriber_cap IS NOT NULL AND v_new_count >= v_row.subscriber_cap THEN
    -- Mark current phase as no longer current
    UPDATE membership_phases
    SET is_current = FALSE
    WHERE id = v_row.id;

    -- Advance next phase if it exists
    UPDATE membership_phases
    SET is_current = TRUE
    WHERE plan_key = p_plan_key
      AND phase = v_row.phase + 1
      AND is_current = FALSE;
  END IF;

  RETURN jsonb_build_object(
    'ok',             true,
    'phase',          v_row.phase,
    'stripe_price_id', v_row.stripe_price_id,
    'price_label',    v_row.price_label
  );
END;
$$;

-- ── 5. FUNCTION award_points_for_user ───────────────────────

CREATE OR REPLACE FUNCTION award_points_for_user(
  p_user_id   uuid,
  p_reason    text,
  p_points    int,
  p_label     text    DEFAULT NULL,
  p_once_per  text    DEFAULT 'ever',
  p_source    text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_id  uuid;
  v_existing   bigint;
  v_dedup_key  text;
BEGIN
  -- Only callable by service_role
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  -- Look up vault_members.id from user_id (auth.uid maps to vault_members.id directly in this schema)
  SELECT id INTO v_member_id
  FROM vault_members
  WHERE id = p_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'member_not_found');
  END IF;

  -- Build dedup key based on once_per policy
  v_dedup_key := CASE p_once_per
    WHEN 'ever'  THEN p_reason
    WHEN 'month' THEN p_reason || '_' || to_char(NOW(), 'YYYY_MM')
    WHEN 'week'  THEN p_reason || '_' || to_char(NOW(), 'IYYY_IW')
    WHEN 'day'   THEN p_reason || '_' || to_char(NOW(), 'YYYY_MM_DD')
    ELSE p_reason
  END;

  -- Check dedup
  SELECT id INTO v_existing
  FROM point_events
  WHERE member_id = v_member_id
    AND reason = v_dedup_key
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'already_awarded');
  END IF;

  -- Insert point event
  INSERT INTO point_events (member_id, points, reason, description, source)
  VALUES (
    v_member_id,
    p_points,
    v_dedup_key,
    COALESCE(p_label, p_reason),
    p_source
  );

  -- Update vault_members.points
  UPDATE vault_members
  SET points = points + p_points
  WHERE id = v_member_id;

  RETURN jsonb_build_object(
    'ok',     true,
    'points', p_points,
    'reason', v_dedup_key
  );
END;
$$;
