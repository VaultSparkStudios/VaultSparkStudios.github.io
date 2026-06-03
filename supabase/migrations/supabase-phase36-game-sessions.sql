-- ═══════════════════════════════════════════════════════════════════════════
-- VaultSpark Studios — Phase 36: game_sessions INSERT policy
-- Allows authenticated users to record their own game page visits.
-- Run in Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- Allow authenticated members to insert their own sessions.
-- The game pages POST a row once per day (deduped via localStorage).
create policy "users insert own game sessions"
  on public.game_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);
