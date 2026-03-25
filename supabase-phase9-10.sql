-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 9: Web Push Notifications
-- Phase 10: Live Studio Pulse
-- Run this in the Supabase SQL Editor (project: fjnpzjjyhnpmunfoycrp)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Phase 9 ──────────────────────────────────────────────────────────────────

create table if not exists public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  endpoint   text        unique not null,
  keys       jsonb       not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "own subscription select"
  on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

create policy "own subscription insert"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

create policy "own subscription delete"
  on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- RPC: upsert_push_subscription — save/update a push endpoint + keys for the authed user
create or replace function public.upsert_push_subscription(
  p_endpoint text,
  p_keys     jsonb
) returns void
language sql
security definer
set search_path = public
as $$
  insert into push_subscriptions (user_id, endpoint, keys)
  values (auth.uid(), p_endpoint, p_keys)
  on conflict (endpoint)
  do update set keys    = excluded.keys,
                user_id = excluded.user_id;
$$;
grant execute on function public.upsert_push_subscription(text, jsonb) to authenticated;

-- RPC: delete_push_subscription — remove a subscription by endpoint for the authed user
create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from push_subscriptions
  where user_id  = auth.uid()
    and endpoint = p_endpoint;
$$;
grant execute on function public.delete_push_subscription(text) to authenticated;


-- ─── Phase 10 ─────────────────────────────────────────────────────────────────

create table if not exists public.studio_pulse (
  id         uuid        primary key default gen_random_uuid(),
  message    text        not null,
  type       text        not null default 'update', -- 'update' | 'alert' | 'drop'
  created_at timestamptz not null default now()
);

alter table public.studio_pulse enable row level security;

create policy "authenticated read pulse"
  on public.studio_pulse for select
  to authenticated
  using (true);

-- Enable Realtime on this table:
-- Supabase Dashboard → Database → Replication → enable studio_pulse

-- Seed a few opening transmissions
insert into public.studio_pulse (message, type, created_at) values
  ('Vault Member Portal fully operational. Phases 1–10 online.', 'update', now() - interval '2 minutes'),
  ('Live Studio Pulse activated — you are now receiving direct transmissions from the studio.', 'drop', now() - interval '1 minute'),
  ('Chronicle, Discord sync, Early Access, and Push Notifications now live for all Vault Members.', 'update', now());
