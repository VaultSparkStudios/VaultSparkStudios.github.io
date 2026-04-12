-- ══════════════════════════════════════════════════════════════════════
-- Phase 59 — Vault Wall public_profile opt-out
-- ══════════════════════════════════════════════════════════════════════
-- Adds a public_profile flag to vault_members so members can opt out
-- of the Vault Wall and any other public member-listing features.
--
-- Default: true (opted in) — no change to existing members.
-- The Vault Wall queries filter by public_profile = true.
--
-- Portal settings will expose a toggle: "Show my profile on the Vault Wall."
-- ══════════════════════════════════════════════════════════════════════

-- 1. Add column (safe — DEFAULT true means no rows change behaviour)
ALTER TABLE public.vault_members
  ADD COLUMN IF NOT EXISTS public_profile boolean NOT NULL DEFAULT true;

-- 2. Index for the Vault Wall filter (small table but good practice)
CREATE INDEX IF NOT EXISTS idx_vault_members_public_profile
  ON public.vault_members (public_profile)
  WHERE public_profile = true;

-- 3. Expose column via RLS-aware select (anon role already has SELECT on vault_members)
--    No extra grants needed — column inherits existing table-level permissions.

-- ══════════════════════════════════════════════════════════════════════
-- Verification:
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'vault_members' AND column_name = 'public_profile';
--
--   -- All existing members should be opted in:
--   SELECT COUNT(*) FROM vault_members WHERE public_profile = true;
-- ══════════════════════════════════════════════════════════════════════
