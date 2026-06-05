-- ═══════════════════════════════════════════════════════════════════════════
--  VaultSpark Studios — Investor Area Phase 4: Investor Request Form
--  Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════


-- ── investor_requests ────────────────────────────────────────────────────────
-- Public form submissions from prospective investors.
-- Anyone can INSERT. Only admin can SELECT / UPDATE.

create table public.investor_requests (
  id               uuid        primary key default gen_random_uuid(),

  -- Contact
  full_name        text        not null,
  email            text        not null,
  entity_type      text        not null default 'individual',
    -- 'individual' | 'angel' | 'firm' | 'fund'
  organization     text,                        -- firm / fund name if applicable

  -- Questionnaire
  investment_range text        not null default 'unspecified',
    -- 'under_10k' | '10k_50k' | '50k_250k' | '250k_plus' | 'unspecified'
  why_approve      text        not null,        -- "Why should we approve you?"
  why_vaultspark   text        not null,        -- "What interests you about us?"
  investing_history text,                       -- Prior investment background
  value_beyond_capital text,                    -- Strategic value add
  prior_gaming     boolean     default false,   -- Invested in gaming/entertainment before?
  how_heard        text,                        -- How did you find us?

  -- Status
  status           text        not null default 'pending',
    -- 'pending' | 'approved' | 'rejected' | 'contacted'
  admin_notes      text,
  reviewed_by      uuid        references auth.users(id),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);

alter table public.investor_requests enable row level security;

-- Anyone (including unauthenticated) can submit a request
create policy "public can submit investor request"
  on public.investor_requests for insert
  to anon, authenticated
  with check (true);

-- Admin reads all requests
create policy "admin reads investor requests"
  on public.investor_requests for select
  to authenticated
  using (
    auth.uid() = (select id from public.vault_members where username_lower = 'vaultspark')
  );

-- Admin updates requests (status, notes)
create policy "admin updates investor requests"
  on public.investor_requests for update
  to authenticated
  using (
    auth.uid() = (select id from public.vault_members where username_lower = 'vaultspark')
  );

create index idx_investor_requests_status
  on public.investor_requests(status, created_at desc);


-- ── get_investor_request_count ────────────────────────────────────────────────
-- Returns count of pending requests only — no PII.
-- Safe for anon access (Studio Hub uses anon key).

create or replace function public.get_investor_request_count()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending  bigint;
  v_total    bigint;
begin
  select count(*) into v_pending from investor_requests where status = 'pending';
  select count(*) into v_total   from investor_requests;
  return jsonb_build_object('pending', v_pending, 'total', v_total);
end;
$$;

grant execute on function public.get_investor_request_count() to anon, authenticated;


-- ── admin_get_investor_requests ───────────────────────────────────────────────
-- Returns full request list for admin panels. Admin only.

create or replace function public.admin_get_investor_requests(
  p_status text default null   -- filter by status, or null for all
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not exists (
    select 1 from vault_members where id = v_uid and username_lower = 'vaultspark'
  ) then
    return jsonb_build_object('error', 'Unauthorized');
  end if;

  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id',                   r.id,
        'full_name',            r.full_name,
        'email',                r.email,
        'entity_type',          r.entity_type,
        'organization',         r.organization,
        'investment_range',     r.investment_range,
        'why_approve',          r.why_approve,
        'why_vaultspark',       r.why_vaultspark,
        'investing_history',    r.investing_history,
        'value_beyond_capital', r.value_beyond_capital,
        'prior_gaming',         r.prior_gaming,
        'how_heard',            r.how_heard,
        'status',               r.status,
        'admin_notes',          r.admin_notes,
        'created_at',           r.created_at
      )
      order by r.created_at desc
    ), '[]'::jsonb)
    from investor_requests r
    where (p_status is null or r.status = p_status)
  );
end;
$$;

grant execute on function public.admin_get_investor_requests(text) to authenticated;


-- ── admin_update_investor_request ─────────────────────────────────────────────
-- Update status and optional admin notes on a request. Admin only.

create or replace function public.admin_update_investor_request(
  p_request_id uuid,
  p_status     text,
  p_notes      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not exists (
    select 1 from vault_members where id = v_uid and username_lower = 'vaultspark'
  ) then
    return jsonb_build_object('error', 'Unauthorized');
  end if;

  if p_status not in ('pending', 'approved', 'rejected', 'contacted') then
    return jsonb_build_object('error', 'Invalid status');
  end if;

  update investor_requests set
    status      = p_status,
    admin_notes = coalesce(p_notes, admin_notes),
    reviewed_by = v_uid,
    reviewed_at = now()
  where id = p_request_id;

  if not found then
    return jsonb_build_object('error', 'Request not found');
  end if;

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

grant execute on function public.admin_update_investor_request(uuid, text, text) to authenticated;
