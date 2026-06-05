-- Phase 45: Season Pass / Battle Pass
-- Time-bounded XP progression with tier rewards.
-- XP earned during an active season automatically counts toward season tier unlocks.

-- ── seasons ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasons (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  slug        text        NOT NULL UNIQUE,
  description text,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz NOT NULL,
  active      boolean     DEFAULT false,
  banner_text text,
  created_at  timestamptz DEFAULT now()
);

-- ── battle_pass_tiers ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS battle_pass_tiers (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id    uuid REFERENCES seasons(id) ON DELETE CASCADE NOT NULL,
  tier         int  NOT NULL,
  xp_required  int  NOT NULL,
  reward_label text NOT NULL,
  reward_type  text DEFAULT 'badge' CHECK (reward_type IN ('badge','title','lore','access','cosmetic','discord')),
  reward_value text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(season_id, tier)
);

-- ── season_xp ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS season_xp (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES vault_members(id) ON DELETE CASCADE NOT NULL,
  season_id  uuid        REFERENCES seasons(id) ON DELETE CASCADE NOT NULL,
  xp         int         NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, season_id)
);

CREATE INDEX IF NOT EXISTS season_xp_season_xp_idx ON season_xp(season_id, xp DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE seasons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_pass_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_xp        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read seasons" ON seasons;
CREATE POLICY "Anyone can read seasons"      ON seasons          FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can read bp tiers" ON battle_pass_tiers;
CREATE POLICY "Anyone can read bp tiers"     ON battle_pass_tiers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users read own season xp" ON season_xp;
CREATE POLICY "Users read own season xp"     ON season_xp        FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service manages season xp" ON season_xp;
CREATE POLICY "Service manages season xp"    ON season_xp        FOR ALL    USING (auth.role() = 'service_role');

-- ── get_season_pass RPC ───────────────────────────────────────────────────
-- Returns active season, tiers, and caller's current season XP.
CREATE OR REPLACE FUNCTION get_season_pass()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id  uuid    := auth.uid();
  v_season   record;
  v_user_xp  int     := 0;
  v_tiers    jsonb;
BEGIN
  SELECT * INTO v_season
    FROM seasons
   WHERE active = true AND now() BETWEEN start_at AND end_at
   ORDER BY start_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('season', null, 'user_xp', 0, 'tiers', '[]'::jsonb);
  END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT COALESCE(xp, 0) INTO v_user_xp
      FROM season_xp
     WHERE user_id = v_user_id AND season_id = v_season.id;
  END IF;

  SELECT jsonb_agg(to_jsonb(t) ORDER BY t.tier)
    INTO v_tiers
    FROM battle_pass_tiers t
   WHERE season_id = v_season.id;

  RETURN jsonb_build_object(
    'season',   to_jsonb(v_season),
    'user_xp',  v_user_xp,
    'tiers',    COALESCE(v_tiers, '[]'::jsonb)
  );
END;
$$;

-- ── Trigger: award season XP when any points are earned ───────────────────
CREATE OR REPLACE FUNCTION _award_season_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season_id uuid;
BEGIN
  SELECT id INTO v_season_id
    FROM seasons
   WHERE active = true AND now() BETWEEN start_at AND end_at
   LIMIT 1;

  IF v_season_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO season_xp(user_id, season_id, xp)
  VALUES (NEW.user_id, v_season_id, NEW.points)
  ON CONFLICT (user_id, season_id)
  DO UPDATE SET xp = season_xp.xp + NEW.points, updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_season_xp ON point_events;
CREATE TRIGGER trg_season_xp
  AFTER INSERT ON point_events
  FOR EACH ROW
  EXECUTE FUNCTION _award_season_xp();

-- ── Seed: Season 1 — Vault Ignition ──────────────────────────────────────
INSERT INTO seasons(name, slug, description, start_at, end_at, active, banner_text)
VALUES (
  'Vault Ignition',
  'vault-ignition',
  'The first VaultSpark season. Every XP earned counts toward your Battle Pass tier — earn enough to reach Season Archon before the vault resets.',
  '2026-03-26 00:00:00+00',
  '2026-06-30 23:59:59+00',
  true,
  'Season 1 ends June 30 — earn XP now to claim your tiers before the vault resets.'
)
ON CONFLICT (slug) DO NOTHING;

WITH s AS (SELECT id FROM seasons WHERE slug = 'vault-ignition' LIMIT 1)
INSERT INTO battle_pass_tiers(season_id, tier, xp_required, reward_label, reward_type, reward_value)
SELECT s.id, v.tier, v.xp_required, v.reward_label, v.reward_type, v.reward_value
FROM s, (VALUES
  (1,  100,   'Ignition Badge',                     'badge',    'ignition'),
  (2,  300,   'Forge Tier — Profile Title',          'title',    'forge_tier'),
  (3,  600,   'Season Signal — Exclusive Post',      'access',   'season_signal_post'),
  (4,  1200,  'Vault Cipher — Profile Border',       'cosmetic', 'cipher_border_s1'),
  (5,  2500,  'Season Warden — Discord Role',        'discord',  'season_warden_s1'),
  (6,  4000,  'DreadSpike Lore Pack',                'lore',     'dreadspike_lore_s1'),
  (7,  6000,  'Early Access — Beta Game Invite',     'access',   'beta_invite_s1'),
  (8,  8500,  'Vault Champion — Profile Banner',     'cosmetic', 'champion_banner_s1'),
  (9,  12000, 'Season Archon — Permanent Status',    'badge',    'season_archon_s1')
) AS v(tier, xp_required, reward_label, reward_type, reward_value)
ON CONFLICT (season_id, tier) DO NOTHING;
