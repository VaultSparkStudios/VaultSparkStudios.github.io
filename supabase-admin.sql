-- ─────────────────────────────────────────────────────────────────
-- Vault Command — Admin INSERT policies for Vault Member #1
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- Studio Pulse: member #1 can insert live studio signals
create policy "admin insert pulse"
  on public.studio_pulse
  for insert
  to authenticated
  with check (
    auth.uid() = (select id from vault_members where member_number = 1)
  );

-- Classified Files: member #1 can uplink new files to the Archive
-- (INSERT fires the on_classified_file_insert trigger → push notifications)
create policy "admin insert classified_files"
  on public.classified_files
  for insert
  to authenticated
  with check (
    auth.uid() = (select id from vault_members where member_number = 1)
  );

-- Beta Keys: member #1 can deploy new keys to the Key Vault
create policy "admin insert beta_keys"
  on public.beta_keys
  for insert
  to authenticated
  with check (
    auth.uid() = (select id from vault_members where member_number = 1)
  );
