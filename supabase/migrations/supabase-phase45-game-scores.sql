-- Phase 45: Game Score Submission API
-- Enables per-game high score tracking with XP rewards for milestones.
-- Usage: games call the submit_game_score RPC via vault-score.js SDK.

-- ── Table ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_scores (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES vault_members(id) ON DELETE CASCADE NOT NULL,
  game_slug  text        NOT NULL,
  score      bigint      NOT NULL DEFAULT 0,
  metadata   jsonb       DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- One best score per user per game
CREATE UNIQUE INDEX IF NOT EXISTS game_scores_user_game_uidx ON game_scores(user_id, game_slug);

-- Fast leaderboard queries
CREATE INDEX IF NOT EXISTS game_scores_slug_score_idx ON game_scores(game_slug, score DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read game scores" ON game_scores;
CREATE POLICY "Anyone can read game scores"
  ON game_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own game scores" ON game_scores;
CREATE POLICY "Users insert own game scores"
  ON game_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own game scores" ON game_scores;
CREATE POLICY "Users update own game scores"
  ON game_scores FOR UPDATE USING (auth.uid() = user_id);

-- ── submit_game_score RPC ─────────────────────────────────────────────────
-- Called by vault-score.js SDK on game pages.
-- Only records if the new score beats the existing best.
-- Awards XP at milestones: 1k, 5k, 10k, 50k, 100k.
CREATE OR REPLACE FUNCTION submit_game_score(
  p_game_slug text,
  p_score     bigint,
  p_metadata  jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id  uuid   := auth.uid();
  v_existing bigint;
  v_rank     bigint;
  v_xp       int    := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT score INTO v_existing
    FROM game_scores
   WHERE user_id = v_user_id AND game_slug = p_game_slug;

  IF v_existing IS NULL OR p_score > v_existing THEN
    INSERT INTO game_scores(user_id, game_slug, score, metadata, updated_at)
    VALUES (v_user_id, p_game_slug, p_score, p_metadata, now())
    ON CONFLICT (user_id, game_slug)
    DO UPDATE SET score = p_score, metadata = p_metadata, updated_at = now();

    -- XP milestones: only awarded once per threshold per game per player
    IF (v_existing IS NULL OR v_existing < 1000)   AND p_score >= 1000   THEN
      PERFORM award_points(v_user_id, 10,  'score_1k_'   || p_game_slug, 'Score 1,000 in '   || p_game_slug);
      v_xp := v_xp + 10;
    END IF;
    IF (v_existing IS NULL OR v_existing < 5000)   AND p_score >= 5000   THEN
      PERFORM award_points(v_user_id, 25,  'score_5k_'   || p_game_slug, 'Score 5,000 in '   || p_game_slug);
      v_xp := v_xp + 25;
    END IF;
    IF (v_existing IS NULL OR v_existing < 10000)  AND p_score >= 10000  THEN
      PERFORM award_points(v_user_id, 50,  'score_10k_'  || p_game_slug, 'Score 10,000 in '  || p_game_slug);
      v_xp := v_xp + 50;
    END IF;
    IF (v_existing IS NULL OR v_existing < 50000)  AND p_score >= 50000  THEN
      PERFORM award_points(v_user_id, 100, 'score_50k_'  || p_game_slug, 'Score 50,000 in '  || p_game_slug);
      v_xp := v_xp + 100;
    END IF;
    IF (v_existing IS NULL OR v_existing < 100000) AND p_score >= 100000 THEN
      PERFORM award_points(v_user_id, 200, 'score_100k_' || p_game_slug, 'Score 100,000 in ' || p_game_slug);
      v_xp := v_xp + 200;
    END IF;
  END IF;

  SELECT COUNT(*) + 1 INTO v_rank
    FROM game_scores
   WHERE game_slug = p_game_slug
     AND score > COALESCE(GREATEST(p_score, v_existing), p_score);

  RETURN jsonb_build_object(
    'ok',         true,
    'rank',       v_rank,
    'xp_awarded', v_xp,
    'high_score', GREATEST(p_score, COALESCE(v_existing, 0)),
    'is_new_best', v_existing IS NULL OR p_score > v_existing
  );
END;
$$;
