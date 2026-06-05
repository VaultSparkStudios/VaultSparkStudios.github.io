-- Kudos System — run in Supabase SQL Editor
-- Awards +5 XP to recipient, +2 XP to sender. One kudo per target per day.

-- 1. Table
CREATE TABLE IF NOT EXISTS kudos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_member  UUID NOT NULL REFERENCES vault_members(id) ON DELETE CASCADE,
  to_member    UUID NOT NULL REFERENCES vault_members(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate kudos from same sender to same target on the same UTC day
CREATE UNIQUE INDEX IF NOT EXISTS kudos_daily_unique
  ON kudos (from_member, to_member, (date_trunc('day', created_at AT TIME ZONE 'UTC')::date));

-- 2. RLS
ALTER TABLE kudos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can send kudos"    ON kudos;
DROP POLICY IF EXISTS "Members can read kudos"    ON kudos;

CREATE POLICY "Members can send kudos" ON kudos
  FOR INSERT TO authenticated
  WITH CHECK (from_member = auth.uid());

CREATE POLICY "Members can read kudos" ON kudos
  FOR SELECT TO authenticated
  USING (true);

-- 3. RPC: send_kudos(p_to_username TEXT) → JSON
CREATE OR REPLACE FUNCTION send_kudos(p_to_username TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from   UUID := auth.uid();
  v_to     UUID;
  v_today  DATE := CURRENT_DATE;
BEGIN
  -- Resolve recipient
  SELECT id INTO v_to FROM vault_members WHERE username = p_to_username LIMIT 1;
  IF v_to IS NULL THEN
    RETURN json_build_object('error', 'Member not found');
  END IF;

  -- Cannot kudo yourself
  IF v_to = v_from THEN
    RETURN json_build_object('error', 'Cannot send kudos to yourself');
  END IF;

  -- Daily duplicate check
  IF EXISTS (
    SELECT 1 FROM kudos
    WHERE from_member = v_from
      AND to_member   = v_to
      AND date_trunc('day', created_at AT TIME ZONE 'UTC')::date = v_today
  ) THEN
    RETURN json_build_object('error', 'Already sent kudos to this member today');
  END IF;

  -- Insert kudos record
  INSERT INTO kudos (from_member, to_member) VALUES (v_from, v_to);

  -- Award XP: +5 to recipient, +2 to sender
  UPDATE vault_members SET points = points + 5 WHERE id = v_to;
  UPDATE vault_members SET points = points + 2 WHERE id = v_from;

  -- Log point events
  INSERT INTO point_events (member_id, points, reason, description)
  VALUES
    (v_to,   5, 'kudos_received', 'Kudos from a vault member'),
    (v_from, 2, 'kudos_sent',     'Kudos sent to ' || p_to_username);

  RETURN json_build_object('success', true, 'xp_awarded', 5);
END;
$$;

-- 4. RPC: get_my_kudos_received() → recent kudos received (last 20)
CREATE OR REPLACE FUNCTION get_my_kudos_received()
RETURNS TABLE (from_username TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT vm.username, k.created_at
    FROM kudos k
    JOIN vault_members vm ON vm.id = k.from_member
    WHERE k.to_member = auth.uid()
    ORDER BY k.created_at DESC
    LIMIT 20;
END;
$$;
