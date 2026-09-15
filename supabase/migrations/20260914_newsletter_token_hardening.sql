-- Newsletter unsubscribe-token hardening.
-- Idempotent. NOT APPLIED by the session that wrote it — apply with the repo's
-- migration applier after reviewing the duplicate-token report below.
--
-- WHAT WAS WRONG (supabase/migrations/supabase-phase45-newsletter.sql:36-37)
--
--   1. newsletter_preferences.unsubscribe_token had NO uniqueness guarantee, while
--      unsubscribe_newsletter(p_token) resolves a member BY that token:
--          SELECT user_id INTO v_user_id FROM newsletter_preferences
--           WHERE unsubscribe_token = p_token;
--   2. Policy "Users manage own newsletter prefs" was FOR ALL USING (auth.uid() = user_id),
--      which let a member write EVERY column of their own row — unsubscribe_token included.
--
--   Together those are an account-crossing bug: a member could read another member's
--   token out of an email (or a forwarded copy) and write it into their OWN row. The
--   victim's unsubscribe click would then resolve to whichever row the unqualified
--   SELECT happened to return — silently opting out the wrong person, or reporting
--   success to the clicker while leaving them subscribed.
--
-- WHAT THIS CHANGES
--
--   * UNIQUE index on newsletter_preferences(unsubscribe_token) (NULLs still allowed,
--     and multiple NULLs stay legal — a null/malformed token is re-issued by
--     send-member-newsletter's ensureUnsubscribeToken before any mail goes out).
--   * Duplicate tokens are DETECTED AND REPORTED, never rewritten or deleted: this
--     script raises an exception naming the affected row count and stops. Re-issuing a
--     token silently would invalidate a live unsubscribe link, which is exactly the
--     kind of data loss that must be a human decision.
--   * The member-facing FOR ALL policy is replaced by SELECT (own row) + UPDATE (own
--     row), and column privileges narrow that UPDATE to opted_out/opted_out_at/updated_at.
--     RLS cannot restrict columns; GRANT can — so the two are used together.
--     unsubscribe_token and user_id become writable by the service role only.
--   * unsubscribe_newsletter() is recreated byte-identical in behaviour with an
--     explicit search_path (SECURITY DEFINER hardening) and a LIMIT 1 that documents
--     the now-enforced at-most-one-row resolution.
--
-- WHAT THIS DOES NOT CHANGE
--
--   * The RPCs stay SECURITY DEFINER, so they run as their owner and are unaffected by
--     both the narrowed policy and the column grants. The member portal reaches
--     opt-out through toggle_newsletter_opt_out()/get_newsletter_preference(), and the
--     email link through unsubscribe_newsletter() — all three keep working.
--   * The service role bypasses RLS and keeps its own grants, so
--     ensureUnsubscribeToken()'s upsert/update in send-member-newsletter is unaffected.

-- ── 1. Duplicate detection (report, never destroy) ─────────────────────────
DO $$
DECLARE
  v_dupe_groups int;
  v_dupe_rows   int;
BEGIN
  SELECT count(*), coalesce(sum(c), 0)
    INTO v_dupe_groups, v_dupe_rows
    FROM (
      SELECT count(*) AS c
        FROM newsletter_preferences
       WHERE unsubscribe_token IS NOT NULL
         AND unsubscribe_token <> ''
       GROUP BY unsubscribe_token
      HAVING count(*) > 1
    ) d;

  IF v_dupe_groups > 0 THEN
    RAISE EXCEPTION
      'newsletter_preferences.unsubscribe_token has % duplicated token value(s) across % row(s). '
      'Refusing to create the UNIQUE index, and refusing to rewrite tokens automatically: '
      'rotating a token invalidates a live unsubscribe link. Inspect with: '
      'SELECT unsubscribe_token, array_agg(user_id) FROM newsletter_preferences '
      'WHERE unsubscribe_token IS NOT NULL AND unsubscribe_token <> '''' '
      'GROUP BY 1 HAVING count(*) > 1; '
      'then decide per group which row keeps the token before re-running this migration.',
      v_dupe_groups, v_dupe_rows;
  END IF;

  RAISE NOTICE 'newsletter_preferences.unsubscribe_token: no duplicates found; creating UNIQUE index.';
END;
$$;

-- Empty-string tokens are not a valid link shape (the function requires 32 hex chars)
-- and would collide with each other under the unique index; normalise them to NULL so
-- ensureUnsubscribeToken() re-issues a real one. No real token is touched.
UPDATE newsletter_preferences
   SET unsubscribe_token = NULL
 WHERE unsubscribe_token = '';

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_preferences_unsubscribe_token_key
  ON newsletter_preferences (unsubscribe_token);

-- ── 2. Narrow the member policy: opted_out only ────────────────────────────
DROP POLICY IF EXISTS "Users manage own newsletter prefs" ON newsletter_preferences;

DROP POLICY IF EXISTS "Users read own newsletter prefs" ON newsletter_preferences;
CREATE POLICY "Users read own newsletter prefs"
  ON newsletter_preferences FOR SELECT USING (auth.uid() = user_id);

-- Row scope via RLS; column scope via the grants below. A member may flip their own
-- opt-out and nothing else — no INSERT, no DELETE, no token write.
DROP POLICY IF EXISTS "Users update own newsletter opt-out" ON newsletter_preferences;
CREATE POLICY "Users update own newsletter opt-out"
  ON newsletter_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON newsletter_preferences FROM authenticated;
GRANT SELECT ON newsletter_preferences TO authenticated;
GRANT UPDATE (opted_out, opted_out_at, updated_at) ON newsletter_preferences TO authenticated;

-- anon never touches this table directly; the email link goes through the
-- SECURITY DEFINER RPC, which runs as the function owner.
REVOKE ALL ON newsletter_preferences FROM anon;

DROP POLICY IF EXISTS "Service reads newsletter prefs" ON newsletter_preferences;
CREATE POLICY "Service manages newsletter prefs"
  ON newsletter_preferences FOR ALL USING (auth.role() = 'service_role');

-- ── 3. SECURITY DEFINER hardening for the token lookup ─────────────────────
CREATE OR REPLACE FUNCTION unsubscribe_newsletter(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF p_token IS NULL OR p_token = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;

  -- At most one row can match now that unsubscribe_token is UNIQUE; LIMIT 1 states it.
  SELECT user_id INTO v_user_id
    FROM newsletter_preferences
   WHERE unsubscribe_token = p_token
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;

  UPDATE newsletter_preferences
     SET opted_out = true, opted_out_at = now(), updated_at = now()
   WHERE user_id = v_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
