-- Phase 48: Vault Seasons — Cross-Game XP Integration
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/fjnpzjjyhnpmunfoycrp/sql
-- Requires: seasons, season_xp tables from phase45-seasons.sql

-- Add season XP tracking to vault_members
ALTER TABLE vault_members ADD COLUMN IF NOT EXISTS season_xp integer NOT NULL DEFAULT 0;
ALTER TABLE vault_members ADD COLUMN IF NOT EXISTS current_season_id uuid REFERENCES seasons(id);

-- RPC: award season XP to a member from any activity source
CREATE OR REPLACE FUNCTION award_season_xp(p_user_id uuid, p_xp integer, p_source text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_season seasons%ROWTYPE;
BEGIN
  SELECT * INTO v_season FROM seasons WHERE is_active = true LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE vault_members SET
    season_xp         = season_xp + p_xp,
    current_season_id = v_season.id
  WHERE id = p_user_id;

  INSERT INTO season_xp (user_id, season_id, xp_earned, source)
  VALUES (p_user_id, v_season.id, p_xp, p_source)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Trigger: award season XP on game score submission (score / 100, capped at 500 XP)
CREATE OR REPLACE FUNCTION trg_fn_season_xp_on_score()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM award_season_xp(NEW.user_id, LEAST(NEW.score / 100, 500), 'game_score:' || NEW.game_slug);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_season_xp_score ON game_scores;
CREATE TRIGGER trg_season_xp_score
  AFTER INSERT ON game_scores
  FOR EACH ROW EXECUTE FUNCTION trg_fn_season_xp_on_score();

-- Trigger: award season XP on challenge completion (50 XP flat)
CREATE OR REPLACE FUNCTION trg_fn_season_xp_on_challenge()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM award_season_xp(NEW.user_id, 50, 'challenge_completion');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_season_xp_challenge ON challenge_submissions;
CREATE TRIGGER trg_season_xp_challenge
  AFTER INSERT ON challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION trg_fn_season_xp_on_challenge();

-- Trigger: award season XP on game session (25 XP flat)
CREATE OR REPLACE FUNCTION trg_fn_season_xp_on_session()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM award_season_xp(NEW.user_id, 25, 'game_session:' || NEW.game_slug);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_season_xp_session ON game_sessions;
CREATE TRIGGER trg_season_xp_session
  AFTER INSERT ON game_sessions
  FOR EACH ROW EXECUTE FUNCTION trg_fn_season_xp_on_session();
