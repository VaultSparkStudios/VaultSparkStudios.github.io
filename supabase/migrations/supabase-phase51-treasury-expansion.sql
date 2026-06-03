-- ═══════════════════════════════════════════════════════════════════════════
-- VaultSpark Studios — Phase 51: Treasury Expansion — 20 new items
-- Run via db-migrate GitHub Action or Supabase SQL editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Expand category CHECK to include 'social'
ALTER TABLE treasury_items DROP CONSTRAINT IF EXISTS treasury_items_category_check;
ALTER TABLE treasury_items ADD CONSTRAINT treasury_items_category_check
  CHECK (category IN ('cosmetic','access','lore','boost','social'));

-- ── Profile Cosmetics ───────────────────────────────────────────────────
INSERT INTO treasury_items (name, description, category, cost, icon, min_rank_pts) VALUES
  ('Neon Pulse Border',
   'Animated cyan pulse border on your profile card — visible in member directory',
   'cosmetic', 300, '💎', 0),

  ('Shadow Veil Background',
   'Dark smoke particle background for your profile card',
   'cosmetic', 400, '🌑', 250),

  ('Holographic Card Effect',
   'Iridescent holographic shimmer overlay on your member card',
   'cosmetic', 750, '🌈', 1000),

  ('Crimson Edge Border',
   'Deep red glowing border — unlocked for serious vault dwellers',
   'cosmetic', 600, '🔴', 3000),

  ('Void Aura Frame',
   'Purple-black animated void effect wrapping your profile card',
   'cosmetic', 2500, '🟣', 15000),

  ('The Sparked Crown',
   'Legendary golden crown badge — only for the elite',
   'cosmetic', 8000, '👑', 60000)
ON CONFLICT DO NOTHING;

-- ── Social Flair ────────────────────────────────────────────────────────
INSERT INTO treasury_items (name, description, category, cost, icon, min_rank_pts) VALUES
  ('Gold Name Glow',
   'Your username displays in gold across the member directory and leaderboards',
   'social', 350, '🌟', 250),

  ('Custom Profile Title',
   'Set a custom subtitle under your username — show your personality',
   'social', 200, '🏷️', 0),

  ('Animated Emoji React Pack',
   'Unlock 12 exclusive animated emoji reactions for community polls and feed',
   'social', 500, '😎', 1000),

  ('Rainbow Name Effect',
   'Cycling rainbow color effect on your name in leaderboards',
   'social', 1500, '🎨', 7500),

  ('Sparkle Trail',
   'Sparkle particle effect that follows your name in the activity feed',
   'social', 1000, '✨', 3000)
ON CONFLICT DO NOTHING;

-- ── Lore Unlocks ────────────────────────────────────────────────────────
INSERT INTO treasury_items (name, description, category, cost, icon, min_rank_pts) VALUES
  ('Classified File: Project Unknown',
   'The redacted design document for the unrevealed fifth game',
   'lore', 1500, '🔒', 3000),

  ('Classified File: The First Spark',
   'The founding story of VaultSpark Studios — told by the founder',
   'lore', 400, '📖', 0),

  ('Classified File: Rift Theory',
   'Deep lore: how the Vault universe connects across all games',
   'lore', 900, '🌀', 1000),

  ('Audio Log: Vault Dispatch #0',
   'Unreleased pilot episode of the studio audio journal',
   'lore', 600, '🎧', 250)
ON CONFLICT DO NOTHING;

-- ── Exclusive Access ────────────────────────────────────────────────────
INSERT INTO treasury_items (name, description, category, cost, icon, min_rank_pts) VALUES
  ('Dev Stream VIP Seat',
   'Priority Q&A slot in the next founder dev stream — ask anything',
   'access', 3000, '🎬', 7500),

  ('Vault Insider Newsletter',
   'Monthly behind-the-scenes email with unreleased screenshots and roadmap previews',
   'access', 1000, '📩', 1000),

  ('Closed Beta: Project Unknown',
   'Guaranteed early access when the secret fifth game enters testing',
   'access', 5000, '🕹️', 3000)
ON CONFLICT DO NOTHING;

-- ── Boost Items ─────────────────────────────────────────────────────────
INSERT INTO treasury_items (name, description, category, cost, icon, min_rank_pts) VALUES
  ('Double XP Weekend Pass',
   'Earn 2× Vault Points for 48 hours on all activities',
   'boost', 2000, '⚡', 3000),

  ('Challenge Skip Token',
   'Auto-complete one daily challenge and collect the reward',
   'boost', 800, '⏭️', 1000),

  ('Bonus Referral Slot',
   'Unlock one extra referral milestone tier beyond the standard 5',
   'boost', 1500, '🔗', 7500)
ON CONFLICT DO NOTHING;
