-- Phase 49: Member Social Graph — Follow System
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/fjnpzjjyhnpmunfoycrp/sql

CREATE TABLE IF NOT EXISTS member_follows (
  follower_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE member_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members can follow"   ON member_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "members can unfollow" ON member_follows FOR DELETE  USING  (auth.uid() = follower_id);
CREATE POLICY "public read follows"  ON member_follows FOR SELECT  USING  (true);

-- RPC: get follower + following counts for a profile
CREATE OR REPLACE FUNCTION get_follow_counts(p_username text)
RETURNS TABLE(followers bigint, following bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    (SELECT COUNT(*) FROM member_follows mf
      JOIN vault_members vm ON mf.following_id = vm.id
      WHERE vm.username = p_username) AS followers,
    (SELECT COUNT(*) FROM member_follows mf
      JOIN vault_members vm ON mf.follower_id = vm.id
      WHERE vm.username = p_username) AS following;
$$;

-- RPC: get activity feed for followed members (last 7 days)
CREATE OR REPLACE FUNCTION get_following_feed(p_user_id uuid, p_limit integer DEFAULT 20)
RETURNS TABLE(event_type text, username text, rank_title text, label text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    'points'       AS event_type,
    vm.username,
    vm.rank_title,
    pe.label,
    pe.created_at
  FROM point_events pe
  JOIN vault_members vm ON pe.user_id = vm.id
  WHERE pe.user_id IN (
    SELECT following_id FROM member_follows WHERE follower_id = p_user_id
  )
  AND pe.created_at > now() - interval '7 days'
  ORDER BY pe.created_at DESC
  LIMIT p_limit;
$$;
