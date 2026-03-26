-- VaultSpark Studios — Community Polls
-- Run in Supabase SQL Editor

-- ── Tables ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS polls (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question   TEXT        NOT NULL,
  options    JSONB       NOT NULL DEFAULT '[]',
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  closes_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      UUID        NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index INTEGER     NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE polls      ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read active polls (public + community page)
CREATE POLICY "polls_public_read" ON polls
  FOR SELECT USING (is_active = true);

-- Admin (member #1) can do everything
CREATE POLICY "polls_admin_all" ON polls
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vault_members
      WHERE user_id = auth.uid() AND member_number = 1
    )
  );

-- Anyone can read vote counts (for leaderboard-style display)
CREATE POLICY "poll_votes_public_read" ON poll_votes
  FOR SELECT USING (true);

-- Authenticated vault members can insert their own vote
CREATE POLICY "poll_votes_member_insert" ON poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Members can delete/change their own vote
CREATE POLICY "poll_votes_member_delete" ON poll_votes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "poll_votes_member_update" ON poll_votes
  FOR UPDATE USING (auth.uid() = user_id);

-- ── Trigger: keep options[*].votes in sync ───────────────────────────────
CREATE OR REPLACE FUNCTION sync_poll_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  p_id UUID := COALESCE(NEW.poll_id, OLD.poll_id);
BEGIN
  UPDATE polls
  SET options = (
    SELECT jsonb_agg(
      jsonb_set(
        elem,
        '{votes}',
        to_jsonb((
          SELECT COUNT(*)::int
          FROM poll_votes
          WHERE poll_id = p_id
            AND option_index = (elem_idx - 1)::int
        ))
      )
      ORDER BY elem_idx
    )
    FROM jsonb_array_elements(options) WITH ORDINALITY AS t(elem, elem_idx)
  )
  WHERE id = p_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_poll_votes
  AFTER INSERT OR UPDATE OR DELETE ON poll_votes
  FOR EACH ROW EXECUTE FUNCTION sync_poll_vote_counts();
