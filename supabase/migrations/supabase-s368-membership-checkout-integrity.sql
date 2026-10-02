-- ═══════════════════════════════════════════════════════════════════════════
-- S368 · membership checkout integrity (D-S368.1)
--
-- 1. Phase slots are counted on payment, not when a Checkout session opens.
--    reserve_phase_slot() picked the price AND incremented subscriber_count, so
--    every abandoned checkout burned a grandfather seat and could advance the
--    phase. It is split into:
--      current_phase_price(p_plan)  read-only: price + phase for a new session
--      claim_phase_slot(p_plan, p_session_id, p_phase, p_user_id)
--                                    idempotent per Checkout session id; called
--                                    by stripe-webhook on checkout.session.completed
--    reserve_phase_slot() is kept for compatibility but is no longer called and
--    is now service-role only (it was SECURITY DEFINER and executable by anon,
--    so anyone could inflate seat counts).
-- 2. Gift expiry. stripe-webhook records gift_subscriptions.expires_at (max 30
--    days). expire_gift_sparked() clears is_sparked / plan_key for members whose
--    only entitlement was a gift that has expired. It never touches a member
--    with a live paid subscription, a VaultSparked Eternal member, a member with
--    an unexpired (or open-ended) gift, or a member who never received a gift.
--    The migrations do not use pg_cron, so nothing is scheduled here: run
--    `select public.expire_gift_sparked();` from a scheduler with the service role.
-- 3. gift_subscriptions accepted INSERTs from any caller ("service insert" WITH
--    CHECK (true)). Only stripe-webhook (service role, bypasses RLS) writes it,
--    and expire_gift_sparked() trusts its rows, so client inserts are closed.
--
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1a. Claims ledger: one counted slot per paid Checkout session ─────────
create table if not exists public.membership_phase_claims (
  session_id  text primary key,
  plan_key    text not null,
  phase       smallint not null,
  user_id     uuid references auth.users(id) on delete set null,
  claimed_at  timestamptz not null default now()
);

alter table public.membership_phase_claims enable row level security;
-- No policies: only the service role (which bypasses RLS) reads or writes it.
revoke all on table public.membership_phase_claims from public, anon, authenticated;
grant all on table public.membership_phase_claims to service_role;

-- ── 1b. current_phase_price: read-only price lookup ───────────────────────
create or replace function public.current_phase_price(p_plan text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.membership_phases%rowtype;
begin
  select * into v_row
  from public.membership_phases
  where plan_key = p_plan
    and is_current = true
  order by phase
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_current_phase');
  end if;

  return jsonb_build_object(
    'ok',              true,
    'phase',           v_row.phase,
    'stripe_price_id', v_row.stripe_price_id,
    'price_label',     v_row.price_label,
    'subscriber_cap',  v_row.subscriber_cap,
    'subscriber_count', v_row.subscriber_count
  );
end;
$$;

revoke all on function public.current_phase_price(text) from public, anon, authenticated;
grant execute on function public.current_phase_price(text) to service_role;

-- ── 1c. claim_phase_slot: idempotent increment on payment ─────────────────
-- p_phase is the phase the member was priced at (session metadata
-- enrolled_phase). When null or unknown, the current phase is counted. The
-- phase only advances when the counted phase is still current and its cap is
-- reached, mirroring reserve_phase_slot().
create or replace function public.claim_phase_slot(
  p_plan       text,
  p_session_id text,
  p_phase      smallint default null,
  p_user_id    uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row       public.membership_phases%rowtype;
  v_new_count int;
  v_inserted  int;
begin
  if p_session_id is null or length(trim(p_session_id)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'missing_session_id');
  end if;

  if p_phase is not null then
    select * into v_row
    from public.membership_phases
    where plan_key = p_plan and phase = p_phase
    for update;
  end if;

  if v_row.id is null then
    select * into v_row
    from public.membership_phases
    where plan_key = p_plan and is_current = true
    order by phase
    limit 1
    for update;
  end if;

  if v_row.id is null then
    return jsonb_build_object('ok', false, 'error', 'no_phase_for_plan');
  end if;

  -- The phase row lock above serialises concurrent claims for this plan; the
  -- primary key makes a replayed webhook a no-op.
  insert into public.membership_phase_claims (session_id, plan_key, phase, user_id)
  values (p_session_id, p_plan, v_row.phase, p_user_id)
  on conflict (session_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return jsonb_build_object('ok', true, 'duplicate', true, 'phase', v_row.phase);
  end if;

  v_new_count := v_row.subscriber_count + 1;

  update public.membership_phases
  set subscriber_count = v_new_count
  where id = v_row.id;

  if v_row.is_current
     and v_row.subscriber_cap is not null
     and v_new_count >= v_row.subscriber_cap then
    update public.membership_phases
    set is_current = false
    where id = v_row.id;

    update public.membership_phases
    set is_current = true
    where plan_key = p_plan
      and phase = v_row.phase + 1
      and is_current = false;
  end if;

  return jsonb_build_object(
    'ok',               true,
    'duplicate',        false,
    'phase',            v_row.phase,
    'subscriber_count', v_new_count
  );
end;
$$;

revoke all on function public.claim_phase_slot(text, text, smallint, uuid) from public, anon, authenticated;
grant execute on function public.claim_phase_slot(text, text, smallint, uuid) to service_role;

-- ── 1d. reserve_phase_slot: kept, no longer called, service role only ─────
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'reserve_phase_slot'
      and pg_get_function_identity_arguments(p.oid) = 'p_plan_key text'
  ) then
    execute 'revoke all on function public.reserve_phase_slot(text) from public, anon, authenticated';
    execute 'grant execute on function public.reserve_phase_slot(text) to service_role';
  end if;
end
$$;

-- ── 2. expire_gift_sparked: clear expired gift-only access ────────────────
create or replace function public.expire_gift_sparked()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.vault_members vm
  set is_sparked = false,
      plan_key   = 'free'
  where vm.is_sparked = true
    -- Gifts only ever grant VaultSparked; Eternal and legacy plans are never touched.
    and coalesce(vm.plan_key, 'free') in ('vault_sparked', 'free')
    -- The member did receive a gift, and it has expired...
    and exists (
      select 1 from public.gift_subscriptions g
      where g.recipient_id = vm.id
        and g.expires_at is not null
        and g.expires_at <= now()
    )
    -- ...and holds no gift that is still running or has no recorded expiry.
    and not exists (
      select 1 from public.gift_subscriptions g
      where g.recipient_id = vm.id
        and (g.expires_at is null or g.expires_at > now())
    )
    -- Never clear a member whose paid subscription still exists in Stripe.
    and not exists (
      select 1 from public.subscriptions s
      where s.user_id = vm.id
        and s.status in ('active', 'trialing', 'past_due', 'unpaid')
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_gift_sparked() from public, anon, authenticated;
grant execute on function public.expire_gift_sparked() to service_role;

-- ── 3. gift_subscriptions: no client inserts ──────────────────────────────
drop policy if exists "service insert" on public.gift_subscriptions;
revoke insert, update, delete on table public.gift_subscriptions from anon, authenticated;
