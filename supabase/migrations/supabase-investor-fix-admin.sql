-- ═══════════════════════════════════════════════════════════════════════════
--  VaultSpark Studios — Investor Admin Fix
--  Run in: Supabase Dashboard → SQL Editor
--
--  This does two things:
--  1. Creates an investor record for founder@vaultsparkstudios.com so
--     get_my_investor_profile() works (the proper long-term fix).
--  2. Adds is_vault_admin() RPC as an additional bypass for the portal gate.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. Add investor record for the founder account ────────────────────────
-- This inserts a Strategic investor record for founder@vaultsparkstudios.com.
-- If the email is different, update it below before running.
-- ON CONFLICT means it's safe to run multiple times.

insert into public.investors (user_id, display_name, entity_type, tier, status, notes)
select
  u.id,
  'VaultSpark Studios',
  'firm',
  'strategic',
  'active',
  'Studio founder account'
from auth.users u
where u.email = 'founder@vaultsparkstudios.com'
on conflict (user_id) do nothing;


-- ── 2. is_vault_admin() RPC ───────────────────────────────────────────────
-- Returns true if the current user is the vaultspark admin.
-- Uses security definer to bypass RLS.
-- Checks vault_members.id match AND the vaultspark vault_member's auth email
-- to handle cases where the investor portal uses a different auth account.

create or replace function public.is_vault_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Primary check: vault_members.id = auth.uid()
  if exists (
    select 1 from vault_members
    where id = v_uid and username_lower = 'vaultspark'
  ) then
    return true;
  end if;

  -- Secondary check: current user's email matches the vaultspark vault_member's email
  -- Handles the case where vault_member and investor portal use different auth accounts
  return exists (
    select 1 from auth.users current_user_row
    where current_user_row.id = v_uid
      and current_user_row.email = (
        select u.email from auth.users u
        join vault_members vm on vm.id = u.id
        where vm.username_lower = 'vaultspark'
        limit 1
      )
  );
end;
$$;

grant execute on function public.is_vault_admin() to authenticated;
