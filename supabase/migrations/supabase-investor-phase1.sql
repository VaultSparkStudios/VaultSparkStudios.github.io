-- ═══════════════════════════════════════════════════════════════════════════
--  VaultSpark Studios — Investor Area Phase 1: Tables + RLS + Indexes
--  Run in: Supabase Dashboard → SQL Editor
--  Depends on: supabase-schema.sql (vault_members table must exist)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── investors ────────────────────────────────────────────────────────────────
-- Control table. A user can only access the investor portal if a row exists
-- here with their user_id. The owner inserts rows manually or via admin panel.
-- Investors do NOT need to be Vault Members — auth.users is the only dependency.

create table public.investors (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        unique not null references auth.users(id) on delete cascade,
  display_name        text        not null,
  entity_type         text        not null default 'individual',
    -- 'individual' | 'firm' | 'angel' | 'fund'
  investment_amount   numeric(14,2),
  equity_percentage   numeric(6,4),
  investment_date     date,
  tier                text        not null default 'standard',
    -- 'standard' | 'lead' | 'strategic'
  status              text        not null default 'active',
    -- 'active' | 'inactive' | 'exited'
  notes               text,       -- private, owner-only
  onboarded_at        timestamptz default now(),
  created_by          uuid        references auth.users(id),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.investors enable row level security;

-- Investor reads their own row only
create policy "investor reads own record"
  on public.investors for select
  to authenticated
  using (auth.uid() = user_id);

-- Admin inserts investors
create policy "admin inserts investors"
  on public.investors for insert
  to authenticated
  with check (
    auth.uid() = (select id from public.vault_members where username_lower = 'vaultspark')
  );

-- Admin updates investor records
create policy "admin updates investors"
  on public.investors for update
  to authenticated
  using (
    auth.uid() = (select id from public.vault_members where username_lower = 'vaultspark')
  );


-- ── investor_updates ─────────────────────────────────────────────────────────
-- Studio-posted updates visible to investors based on tier.
-- Tier hierarchy: standard < lead < strategic (lead sees standard+lead, strategic sees all).

create table public.investor_updates (
  id              uuid        primary key default gen_random_uuid(),
  title           text        not null,
  body_html       text        not null,
  update_type     text        not null default 'general',
    -- 'general' | 'financial' | 'milestone' | 'product' | 'legal'
  visibility_tier text        not null default 'standard',
    -- 'standard' | 'lead' | 'strategic'
  is_published    boolean     not null default false,
  published_at    timestamptz,
  created_by      uuid        references auth.users(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.investor_updates enable row level security;

-- Investors see published updates at or below their tier level
create policy "investors read eligible updates"
  on public.investor_updates for select
  to authenticated
  using (
    is_published = true
    and exists (
      select 1 from public.investors inv
      where inv.user_id = auth.uid()
        and inv.status = 'active'
        and (
          case inv.tier
            when 'strategic' then true
            when 'lead'      then investor_updates.visibility_tier in ('standard', 'lead')
            else                  investor_updates.visibility_tier = 'standard'
          end
        )
    )
  );

-- Admin manages all updates
create policy "admin manages updates"
  on public.investor_updates for all
  to authenticated
  using (
    auth.uid() = (select id from public.vault_members where username_lower = 'vaultspark')
  )
  with check (
    auth.uid() = (select id from public.vault_members where username_lower = 'vaultspark')
  );


-- ── investor_documents ───────────────────────────────────────────────────────
-- Metadata for files in the private 'investor-docs' Supabase Storage bucket.
-- Actual file access goes through the get_investor_document_url() RPC only —
-- storage paths are never exposed directly to the browser.

create table public.investor_documents (
  id                  uuid        primary key default gen_random_uuid(),
  title               text        not null,
  description         text,
  document_type       text        not null default 'general',
    -- 'pitch_deck' | 'cap_table' | 'financials' | 'legal' | 'product_roadmap' | 'general'
  storage_path        text        not null,
    -- path inside the 'investor-docs' bucket
    -- e.g. "shared/pitch-deck-2026-q1.pdf" or "per-investor/{investor_id}/agreement.pdf"
  visibility_scope    text        not null default 'all_investors',
    -- 'all_investors' | 'lead_and_strategic' | 'strategic_only' | 'per_investor'
  per_investor_id     uuid        references public.investors(id),
    -- only set when visibility_scope = 'per_investor'
  version             text,
  file_size_bytes     bigint,
  mime_type           text,
  is_active           boolean     not null default true,
  uploaded_by         uuid        references auth.users(id),
  uploaded_at         timestamptz default now(),
  created_at          timestamptz default now()
);

alter table public.investor_documents enable row level security;

-- Investors see document metadata if they qualify for the visibility scope
create policy "investors read eligible document metadata"
  on public.investor_documents for select
  to authenticated
  using (
    is_active = true
    and exists (
      select 1 from public.investors inv
      where inv.user_id = auth.uid()
        and inv.status = 'active'
        and (
          investor_documents.visibility_scope = 'all_investors'
          or (investor_documents.visibility_scope = 'lead_and_strategic'
              and inv.tier in ('lead', 'strategic'))
          or (investor_documents.visibility_scope = 'strategic_only'
              and inv.tier = 'strategic')
          or (investor_documents.visibility_scope = 'per_investor'
              and investor_documents.per_investor_id = inv.id)
        )
    )
  );

-- Admin manages all documents
create policy "admin manages documents"
  on public.investor_documents for all
  to authenticated
  using (
    auth.uid() = (select id from public.vault_members where username_lower = 'vaultspark')
  )
  with check (
    auth.uid() = (select id from public.vault_members where username_lower = 'vaultspark')
  );


-- ── investor_activity ────────────────────────────────────────────────────────
-- Append-only audit log of investor portal actions.
-- Investors see only their own log; admin sees all.

create table public.investor_activity (
  id           uuid        primary key default gen_random_uuid(),
  investor_id  uuid        not null references public.investors(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  action       text        not null,
    -- 'login' | 'doc_view' | 'doc_download' | 'update_read' | 'profile_view'
  target_id    uuid,
  target_label text,
  metadata     jsonb       default '{}',
  created_at   timestamptz not null default now()
);

alter table public.investor_activity enable row level security;

-- Investors read their own activity
create policy "investor reads own activity"
  on public.investor_activity for select
  to authenticated
  using (auth.uid() = user_id);

-- Investors insert their own activity (writes go through log_investor_action RPC)
create policy "investor inserts own activity"
  on public.investor_activity for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Admin reads all activity
create policy "admin reads all activity"
  on public.investor_activity for select
  to authenticated
  using (
    auth.uid() = (select id from public.vault_members where username_lower = 'vaultspark')
  );


-- ── Indexes ──────────────────────────────────────────────────────────────────
create index idx_investors_user_id
  on public.investors(user_id);

create index idx_investor_activity_investor
  on public.investor_activity(investor_id, created_at desc);

create index idx_investor_activity_user
  on public.investor_activity(user_id, created_at desc);

create index idx_investor_documents_scope
  on public.investor_documents(visibility_scope, is_active);

create index idx_investor_updates_published
  on public.investor_updates(is_published, published_at desc);
