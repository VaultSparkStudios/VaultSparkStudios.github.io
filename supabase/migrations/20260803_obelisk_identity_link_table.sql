-- S304 (D-S301.10, founder-approved 2026-08-03): public.obelisk_identity_link
--
-- Kills the login scan cliff: `ensureSupabaseIdentityLink` walked
-- /auth/v1/admin/users 100-at-a-time on EVERY callback and fails closed at
-- ~2,000 accounts. This table supplies the uniqueness guarantee auth.users
-- denies us (42501: must be owner of table users) plus an indexed subject
-- lookup, killing both full table walks.
--
-- Written by the Worker BEFORE the app_metadata write, so an interrupted first
-- login leaves a self-healing orphan link row rather than an orphan metadata
-- write. Service-role only: RLS enabled with NO policies (service_role
-- bypasses RLS); anon/authenticated get nothing.
--
-- Idempotent and re-runnable.

create table if not exists public.obelisk_identity_link (
  obelisk_sub text primary key,
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  linked_at   timestamptz not null default now()
);

comment on table public.obelisk_identity_link is
  'Obelisk subject -> Supabase user mapping (S304, D-S301.10). Written by the identity Worker before app_metadata; service-role only.';

alter table public.obelisk_identity_link enable row level security;

revoke all on public.obelisk_identity_link from anon, authenticated;
