-- ═══════════════════════════════════════════════════════════════════════════
--  VaultSpark Studios — Investor Admin Fix
--  Adds is_vault_admin() RPC so the investor login page can reliably detect
--  the studio admin without going through RLS on vault_members directly.
--  Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Returns true if the currently authenticated user is the vaultspark studio admin.
-- Uses security definer to bypass RLS — no PII exposed, boolean return only.
create or replace function public.is_vault_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from vault_members
    where id = auth.uid()
      and username_lower = 'vaultspark'
  );
end;
$$;

grant execute on function public.is_vault_admin() to authenticated;
