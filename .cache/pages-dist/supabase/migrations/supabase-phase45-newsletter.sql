-- Phase 45: Member Newsletter
-- Tracks monthly newsletter sends + opt-out preferences.
-- Used by the send-member-newsletter Edge Function.

-- ── member_newsletter_log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_newsletter_log (
  id       uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id  uuid        REFERENCES vault_members(id) ON DELETE CASCADE NOT NULL,
  period   text        NOT NULL, -- YYYY-MM
  sent_at  timestamptz DEFAULT now(),
  status   text        DEFAULT 'sent',
  UNIQUE(user_id, period)
);

-- ── newsletter_preferences ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_preferences (
  user_id           uuid        REFERENCES vault_members(id) ON DELETE CASCADE PRIMARY KEY,
  opted_out         boolean     DEFAULT false,
  opted_out_at      timestamptz,
  unsubscribe_token text        DEFAULT encode(gen_random_bytes(16), 'hex'),
  updated_at        timestamptz DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE member_newsletter_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own newsletter log" ON member_newsletter_log;
CREATE POLICY "Users read own newsletter log"
  ON member_newsletter_log FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service manages newsletter log" ON member_newsletter_log;
CREATE POLICY "Service manages newsletter log"
  ON member_newsletter_log FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users manage own newsletter prefs" ON newsletter_preferences;
CREATE POLICY "Users manage own newsletter prefs"
  ON newsletter_preferences FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service reads newsletter prefs" ON newsletter_preferences;
CREATE POLICY "Service reads newsletter prefs"
  ON newsletter_preferences FOR SELECT USING (auth.role() = 'service_role');

-- ── RPCs ──────────────────────────────────────────────────────────────────
-- Toggle opt-out for the authenticated user
CREATE OR REPLACE FUNCTION toggle_newsletter_opt_out(p_opted_out boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  INSERT INTO newsletter_preferences(user_id, opted_out, opted_out_at)
  VALUES (
    v_user_id,
    p_opted_out,
    CASE WHEN p_opted_out THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    opted_out    = p_opted_out,
    opted_out_at = CASE WHEN p_opted_out THEN now() ELSE NULL END,
    updated_at   = now();
END;
$$;

-- Token-based unsubscribe (no auth required — used from email link)
CREATE OR REPLACE FUNCTION unsubscribe_newsletter(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id
    FROM newsletter_preferences
   WHERE unsubscribe_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;

  UPDATE newsletter_preferences
     SET opted_out = true, opted_out_at = now(), updated_at = now()
   WHERE user_id = v_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Get newsletter preference for authenticated user
CREATE OR REPLACE FUNCTION get_newsletter_preference()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_pref    record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('opted_out', false, 'unsubscribe_token', null);
  END IF;
  SELECT * INTO v_pref FROM newsletter_preferences WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('opted_out', false, 'unsubscribe_token', null);
  END IF;
  RETURN jsonb_build_object('opted_out', v_pref.opted_out, 'unsubscribe_token', v_pref.unsubscribe_token);
END;
$$;
