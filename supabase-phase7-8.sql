-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 7: Discord Role Sync
-- Phase 8: Beta Key Vault
-- Run this in the Supabase SQL Editor (project: fjnpzjjyhnpmunfoycrp)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Phase 7 ──────────────────────────────────────────────────────────────────

-- Add discord_id column to vault_members
alter table public.vault_members
  add column if not exists discord_id text;

-- RPC: save_discord_id
-- Called from frontend after Discord OAuth link/sign-in to persist the Discord user ID.
create or replace function public.save_discord_id(p_discord_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update vault_members
  set discord_id = p_discord_id
  where id = auth.uid();
$$;

grant execute on function public.save_discord_id(text) to authenticated;


-- ─── Phase 8 ──────────────────────────────────────────────────────────────────

-- Table: beta_keys
create table if not exists public.beta_keys (
  id          uuid primary key default gen_random_uuid(),
  game_slug   text not null,
  key_code    text unique not null,
  claimed_by  uuid references auth.users(id),
  claimed_at  timestamptz,
  min_rank    integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.beta_keys enable row level security;

-- Members can see unclaimed keys they qualify for, or their own claimed keys.
-- Rank is computed from vault_members.points (matching VS.RANKS thresholds).
create policy "members see claimable or own keys"
  on public.beta_keys for select
  to authenticated
  using (
    claimed_by = auth.uid()
    or (
      claimed_by is null
      and min_rank <= (
        select case
          when points >= 10000 then 4
          when points >= 2000  then 3
          when points >= 500   then 2
          when points >= 100   then 1
          else 0
        end
        from vault_members
        where id = auth.uid()
      )
    )
  );

-- RPC: claim_beta_key
-- Atomically claims the first available key for a given game_slug that
-- meets the member's rank. Returns {ok, key_code} or {error}.
create or replace function public.claim_beta_key(p_game_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_rank  integer;
  v_key_id       uuid;
  v_key_code     text;
  v_already      text;
begin
  -- Check member rank
  select case
    when points >= 10000 then 4
    when points >= 2000  then 3
    when points >= 500   then 2
    when points >= 100   then 1
    else 0
  end
  into v_member_rank
  from vault_members
  where id = auth.uid();

  if not found then
    return jsonb_build_object('error', 'member_not_found');
  end if;

  -- Check if member already has a key for this game
  select key_code into v_already
  from beta_keys
  where game_slug = p_game_slug
    and claimed_by = auth.uid()
  limit 1;

  if found then
    return jsonb_build_object('ok', true, 'key_code', v_already, 'already_claimed', true);
  end if;

  -- Lock + claim first available key for this game that meets rank
  select id, key_code
  into v_key_id, v_key_code
  from beta_keys
  where game_slug   = p_game_slug
    and claimed_by  is null
    and min_rank    <= v_member_rank
  order by created_at
  limit 1
  for update skip locked;

  if not found then
    return jsonb_build_object('error', 'no_keys_available');
  end if;

  update beta_keys
  set claimed_by = auth.uid(),
      claimed_at = now()
  where id = v_key_id;

  return jsonb_build_object('ok', true, 'key_code', v_key_code);
end;
$$;

grant execute on function public.claim_beta_key(text) to authenticated;

-- ─── Example seed data (uncomment and edit as needed) ─────────────────────────
-- insert into public.beta_keys (game_slug, key_code, min_rank) values
--   ('call-of-doodie',         'COD-BETA-AAAA-1111', 0),
--   ('call-of-doodie',         'COD-BETA-BBBB-2222', 0),
--   ('gridiron-gm',            'GGM-BETA-AAAA-1111', 1),
--   ('vaultspark-football-gm', 'VSF-BETA-AAAA-1111', 2);
