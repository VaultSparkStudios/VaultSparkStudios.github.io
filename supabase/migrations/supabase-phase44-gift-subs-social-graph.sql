-- Phase 44: Gift Subscriptions + Social Graph
-- Run in Supabase SQL editor

-- ── Gift Subscriptions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gift_subscriptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gifter_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id text,
  duration_days    integer NOT NULL DEFAULT 30,
  activated_at     timestamptz,
  expires_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gift_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gifter reads own" ON gift_subscriptions;
CREATE POLICY "gifter reads own" ON gift_subscriptions
  FOR SELECT USING (auth.uid() = gifter_id OR auth.uid() = recipient_id);
DROP POLICY IF EXISTS "service insert" ON gift_subscriptions;
CREATE POLICY "service insert" ON gift_subscriptions
  FOR INSERT WITH CHECK (true);

-- ── Member Follows (social graph) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_follows (
  follower_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
ALTER TABLE member_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read follows" ON member_follows;
CREATE POLICY "public read follows"  ON member_follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "members follow" ON member_follows;
CREATE POLICY "members follow"       ON member_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "members unfollow" ON member_follows;
CREATE POLICY "members unfollow"     ON member_follows FOR DELETE USING (auth.uid() = follower_id);

-- Helper: follower/following counts (used on public profiles)
CREATE OR REPLACE FUNCTION get_follow_counts(p_user_id uuid)
RETURNS TABLE(followers bigint, following bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    (SELECT count(*) FROM member_follows WHERE following_id = p_user_id),
    (SELECT count(*) FROM member_follows WHERE follower_id  = p_user_id);
$$;

-- Helper: is the current user following a given user?
CREATE OR REPLACE FUNCTION is_following(p_target_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM member_follows
    WHERE follower_id = auth.uid() AND following_id = p_target_id
  );
$$;

-- Helper: paginated list of users that the current member follows (for portal tab)
CREATE OR REPLACE FUNCTION get_my_following(p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS TABLE(
  user_id  uuid,
  username text,
  points   integer
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT vm.id, vm.username, vm.points
  FROM member_follows mf
  JOIN vault_members vm ON vm.id = mf.following_id
  WHERE mf.follower_id = auth.uid()
  ORDER BY mf.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- ── Investor Digest Log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investor_digest_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at     timestamptz NOT NULL DEFAULT now(),
  period      text NOT NULL,          -- e.g. '2026-03'
  recipients  integer NOT NULL DEFAULT 0,
  error       text
);
ALTER TABLE investor_digest_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin read digest log" ON investor_digest_log;
CREATE POLICY "admin read digest log" ON investor_digest_log
  FOR SELECT USING (false);          -- service role only
