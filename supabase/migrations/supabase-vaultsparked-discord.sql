-- ─────────────────────────────────────────────────────────────────
-- VaultSparked Discord Role Sync — is_sparked flag
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────

alter table public.vault_members
  add column if not exists is_sparked boolean default false;
