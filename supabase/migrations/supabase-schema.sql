-- ═══════════════════════════════════════════════════════════════
--  VaultSpark Studios — Supabase Schema
--  Run this in the Supabase SQL Editor (supabase.com → project → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- ── invite_codes ────────────────────────────────────────────────
create table public.invite_codes (
  id         uuid        default gen_random_uuid() primary key,
  code       text        unique not null,             -- e.g. VAULT-A3K9
  notes      text,                                    -- optional: "for John Smith"
  used_at    timestamptz,
  used_by    uuid        references auth.users(id),
  created_at timestamptz default now()
);

-- ── vault_members ───────────────────────────────────────────────
create table public.vault_members (
  id             uuid        references auth.users(id) on delete cascade primary key,
  username       text        unique not null,
  username_lower text        unique not null,
  invite_code    text,
  points         integer     default 10 not null,
  subscribed     boolean     default true not null,
  prefs          jsonb       default '{"updates":true,"lore":true,"access":true}'::jsonb,
  achievements   jsonb       default '[]'::jsonb,
  created_at     timestamptz default now()
);

-- ── Row Level Security ──────────────────────────────────────────
alter table public.invite_codes  enable row level security;
alter table public.vault_members enable row level security;

-- Anyone (including unauthenticated) can check if a code is unused
-- (needed so the register form can validate before sign-up)
create policy "check unused invite codes" on public.invite_codes
  for select using (used_at is null);

-- Authenticated members can read their own record
create policy "read own member record" on public.vault_members
  for select using (auth.uid() = id);

-- Members can update their own preferences / points
create policy "update own member record" on public.vault_members
  for update using (auth.uid() = id);

-- ── RPC: register_with_invite ───────────────────────────────────
-- Called after supabase.auth.signUp() to validate the invite code,
-- create the vault_members row, and mark the code as used — atomically.
-- Runs as security definer so it can write to both tables.

create or replace function public.register_with_invite(
  p_invite_code text,
  p_username    text,
  p_subscribe   boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id      uuid    := auth.uid();
  v_code         text    := upper(trim(p_invite_code));
  v_username     text    := trim(p_username);
  v_uname_lower  text    := lower(trim(p_username));
  v_points       integer := case when p_subscribe then 15 else 10 end;
  v_achievements jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  if not exists (
    select 1 from public.invite_codes
    where code = v_code and used_at is null
  ) then
    return jsonb_build_object('error', 'Invalid or already used invite code.');
  end if;

  if exists (select 1 from public.vault_members where username_lower = v_uname_lower) then
    return jsonb_build_object('error', 'That Vault Handle is already taken.');
  end if;

  if exists (select 1 from public.vault_members where id = v_user_id) then
    return jsonb_build_object('error', 'Account already registered.');
  end if;

  v_achievements := jsonb_build_array(
    jsonb_build_object('id', 'joined', 'earned', now())
  );
  if p_subscribe then
    v_achievements := v_achievements || jsonb_build_array(
      jsonb_build_object('id', 'subscribed', 'earned', now())
    );
  end if;

  insert into public.vault_members
    (id, username, username_lower, invite_code, points, subscribed, achievements)
  values
    (v_user_id, v_username, v_uname_lower, v_code, v_points, p_subscribe, v_achievements);

  update public.invite_codes
  set used_at = now(), used_by = v_user_id
  where code = v_code;

  return jsonb_build_object('success', true, 'points', v_points);
end;
$$;

-- ── RPC: generate_invite_codes (service role only) ──────────────
-- Used by the admin CLI script. Never expose the service role key in a browser.

create or replace function public.generate_invite_codes(
  p_codes text[],
  p_notes text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code  text;
  v_count integer := 0;
begin
  foreach v_code in array p_codes loop
    insert into public.invite_codes (code, notes)
    values (upper(trim(v_code)), p_notes)
    on conflict (code) do nothing;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
