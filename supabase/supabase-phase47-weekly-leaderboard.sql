-- Phase 47: Per-game weekly high score leaderboard
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/fjnpzjjyhnpmunfoycrp/sql

-- Weekly score snapshots
CREATE TABLE IF NOT EXISTS weekly_game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  rank_title text NOT NULL DEFAULT 'Spark Initiate',
  game_slug text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  week_start date NOT NULL, -- Monday of the week (ISO 8601)
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, game_slug, week_start)
);

ALTER TABLE weekly_game_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read weekly scores" ON weekly_game_scores;
CREATE POLICY "public read weekly scores"   ON weekly_game_scores FOR SELECT USING (true);
DROP POLICY IF EXISTS "service write weekly scores" ON weekly_game_scores;
CREATE POLICY "service write weekly scores" ON weekly_game_scores FOR ALL    USING (auth.role() = 'service_role');

-- RPC: submit or update a weekly score (keeps best score per user/game/week)
CREATE OR REPLACE FUNCTION submit_weekly_score(p_user_id uuid, p_game_slug text, p_score integer)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_username   text;
  v_rank_title text;
  v_week_start date;
BEGIN
  SELECT username, rank_title INTO v_username, v_rank_title
  FROM vault_members WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'member_not_found'); END IF;

  v_week_start := date_trunc('week', now())::date;

  INSERT INTO weekly_game_scores (user_id, username, rank_title, game_slug, score, week_start)
  VALUES (p_user_id, v_username, v_rank_title, p_game_slug, p_score, v_week_start)
  ON CONFLICT (user_id, game_slug, week_start)
  DO UPDATE SET
    score      = GREATEST(weekly_game_scores.score, EXCLUDED.score),
    username   = EXCLUDED.username,
    rank_title = EXCLUDED.rank_title;

  RETURN jsonb_build_object('ok', true, 'score', p_score, 'week_start', v_week_start);
END;
$$;

-- RPC: get weekly leaderboard for a game (current week)
CREATE OR REPLACE FUNCTION get_weekly_leaderboard(p_game_slug text)
RETURNS TABLE(rank bigint, username text, rank_title text, score integer, week_start date)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY score DESC) AS rank,
    username, rank_title, score, week_start
  FROM weekly_game_scores
  WHERE game_slug = p_game_slug
    AND week_start = date_trunc('week', now())::date
  ORDER BY score DESC
  LIMIT 25;
$$;
