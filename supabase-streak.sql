-- ─── Streak / Daily Login columns ────────────────────────────────────────────
-- Adds streak_count (running daily-login streak) and last_login_date (UTC date)
-- to the vault_members table. Safe to re-run (IF NOT EXISTS guards).

alter table vault_members
  add column if not exists streak_count    integer not null default 0,
  add column if not exists last_login_date date;
