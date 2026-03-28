-- Phase 46: Vault Treasury — Points Marketplace
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/fjnpzjjyhnpmunfoycrp/sql

-- Items catalog
CREATE TABLE IF NOT EXISTS treasury_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('cosmetic','access','lore','boost')),
  cost integer NOT NULL CHECK (cost > 0),
  icon text NOT NULL DEFAULT '🏆',
  is_active boolean NOT NULL DEFAULT true,
  min_rank_pts integer NOT NULL DEFAULT 0,
  stock integer, -- null = unlimited
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE treasury_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read treasury items" ON treasury_items;
CREATE POLICY "public read treasury items" ON treasury_items FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "admin manage treasury" ON treasury_items;
CREATE POLICY "admin manage treasury" ON treasury_items FOR ALL USING (auth.role() = 'service_role');

-- Purchases ledger
CREATE TABLE IF NOT EXISTS treasury_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES treasury_items(id),
  cost integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE treasury_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members insert own purchases" ON treasury_purchases;
CREATE POLICY "members insert own purchases" ON treasury_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "members read own purchases" ON treasury_purchases;
CREATE POLICY "members read own purchases" ON treasury_purchases FOR SELECT USING (auth.uid() = user_id);

-- RPC: spend points on a treasury item (atomic)
CREATE OR REPLACE FUNCTION purchase_treasury_item(p_user_id uuid, p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item treasury_items;
  v_balance integer;
BEGIN
  SELECT * INTO v_item FROM treasury_items WHERE id = p_item_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'item_not_found'); END IF;

  SELECT points INTO v_balance FROM vault_members WHERE id = p_user_id;
  IF v_balance IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'member_not_found'); END IF;
  IF v_balance < v_item.cost THEN RETURN jsonb_build_object('ok', false, 'error', 'insufficient_points'); END IF;

  -- Block duplicate purchases
  IF EXISTS (SELECT 1 FROM treasury_purchases WHERE user_id = p_user_id AND item_id = p_item_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_owned');
  END IF;

  -- Deduct points
  UPDATE vault_members SET points = points - v_item.cost WHERE id = p_user_id;

  -- Log purchase
  INSERT INTO treasury_purchases (user_id, item_id, cost) VALUES (p_user_id, p_item_id, v_item.cost);

  -- Negative point event for history
  INSERT INTO point_events (user_id, points, label, reason)
  VALUES (p_user_id, -v_item.cost, 'Treasury: ' || v_item.name, 'treasury_purchase');

  RETURN jsonb_build_object('ok', true, 'item', v_item.name, 'cost', v_item.cost);
END;
$$;

-- Seed starter catalog
INSERT INTO treasury_items (name, description, category, cost, icon, min_rank_pts) VALUES
  ('Vault Runner Border',        'Exclusive profile card border — Rift Blue electric glow',                                  'cosmetic', 500,   '🔵', 250),
  ('Forge Fire Badge',           'Deep orange animated profile badge flame effect',                                           'cosmetic', 1500,  '🔥', 3000),
  ('Classified File: Vault Origins', 'Unlock the sealed origin lore document unavailable through standard progression',      'lore',     800,   '📜', 0),
  ('Classified File: DreadSpike Protocol', 'The full DreadSpike character dossier — unredacted',                            'lore',     1200,  '🗂️', 1000),
  ('Early Beta Slot: VaultFront', 'Reserve a guaranteed spot in the VaultFront closed beta',                                'access',   2000,  '🎮', 0),
  ('Weekly XP Boost ×1.5',       'Earn 1.5× Vault Points for 7 days on all activities',                                     'boost',    3000,  '⚡', 7500),
  ('Vault Gold Badge Frame',     'Rare gold animated frame for your member profile card',                                     'cosmetic', 5000,  '✨', 15000),
  ('Founder Signal: Studio Dispatch', 'Receive a personal founder update — limited 20 claims per month',                    'access',   10000, '📡', 30000)
ON CONFLICT DO NOTHING;
