-- ═══════════════════════════════════════════════════════════════════════════
-- VaultSpark Studios — Phase 40: fan_art_submissions
-- Run in Supabase SQL editor.
-- Also create a Storage bucket named "fan-art" with public access in the
-- Supabase dashboard (Storage → New bucket → Name: fan-art → Public).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.fan_art_submissions (
  id            uuid        primary key default gen_random_uuid(),
  member_id     uuid        not null references auth.users(id) on delete cascade,
  username      text        not null,
  title         text        not null,
  description   text,
  character_tag text        not null default 'general',
  file_path     text        not null,   -- Supabase Storage path: {user_id}/{ts}-{filename}
  status        text        not null default 'pending'
                            check (status in ('pending','approved','rejected')),
  admin_notes   text,
  submitted_at  timestamptz not null default now(),
  reviewed_at   timestamptz
);

create index if not exists idx_fan_art_status
  on public.fan_art_submissions(status, submitted_at desc);

create index if not exists idx_fan_art_member
  on public.fan_art_submissions(member_id, submitted_at desc);

alter table public.fan_art_submissions enable row level security;

-- Members can submit their own art
create policy "fan_art_insert_own"
  on public.fan_art_submissions for insert
  to authenticated
  with check (auth.uid() = member_id);

-- Members can read their own submissions (to see status)
create policy "fan_art_select_own"
  on public.fan_art_submissions for select
  to authenticated
  using (auth.uid() = member_id);

-- Public can read approved submissions
create policy "fan_art_select_approved"
  on public.fan_art_submissions for select
  to anon, authenticated
  using (status = 'approved');

-- Admin can read all
create policy "fan_art_admin_select"
  on public.fan_art_submissions for select
  to authenticated
  using (public.is_vault_admin());

-- Admin can update (approve/reject)
create policy "fan_art_admin_update"
  on public.fan_art_submissions for update
  to authenticated
  using (public.is_vault_admin());


-- ── Storage policies (run AFTER creating the "fan-art" bucket) ────────────
-- Allow authenticated users to upload to their own folder
insert into storage.policies (name, bucket_id, operation, definition)
values
  (
    'fan_art_upload_own',
    'fan-art',
    'INSERT',
    '(auth.uid()::text = (storage.foldername(name))[1])'
  ),
  (
    'fan_art_read_public',
    'fan-art',
    'SELECT',
    'true'
  )
on conflict do nothing;
