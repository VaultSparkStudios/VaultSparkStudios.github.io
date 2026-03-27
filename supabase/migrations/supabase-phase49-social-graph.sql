-- Phase 49: Member Social Graph — follow system
-- Adds get_following_feed RPC for activity feed tab
-- Note: member_follows table + base RPCs already exist from phase44

-- RPC: Get follower/following counts for a member (by username)
-- Overrides phase44 version which accepted uuid; this version accepts username text
CREATE OR REPLACE FUNCTION get_follow_counts(p_username text)
RETURNS TABLE(followers bigint, following bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    (SELECT COUNT(*) FROM member_follows mf JOIN vault_members vm ON mf.following_id = vm.id WHERE vm.username = p_username) as followers,
    (SELECT COUNT(*) FROM member_follows mf JOIN vault_members vm ON mf.follower_id = vm.id WHERE vm.username = p_username) as following;
$$;

-- RPC: Get activity feed for followed members
CREATE OR REPLACE FUNCTION get_following_feed(p_user_id uuid, p_limit integer DEFAULT 20)
RETURNS TABLE(
  event_type text,
  username text,
  rank_title text,
  label text,
  created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER AS $$
  -- Point events from followed members
  SELECT
    'points' as event_type,
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
