-- ═══════════════════════════════════════════════════════════════════
-- VaultSpark Studios — Challenge Submissions
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.challenge_submissions (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.vault_members(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  proof_url    text,
  proof_text   text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by  uuid references auth.users(id),
  reviewed_at  timestamptz,
  review_note  text,
  created_at   timestamptz not null default now(),
  unique(member_id, challenge_id)
);

alter table public.challenge_submissions enable row level security;

-- Members can insert their own submissions
create policy "submissions_insert_own" on public.challenge_submissions
  for insert with check (auth.uid() = (
    select id from vault_members where id = auth.uid()
  ));

-- Members can read their own submissions
create policy "submissions_read_own" on public.challenge_submissions
  for select using (auth.uid() = member_id);

-- Admins can read all (via is_vault_admin)
create policy "submissions_admin_read" on public.challenge_submissions
  for select using (public.is_vault_admin());

-- Admins can update (approve/reject)
create policy "submissions_admin_update" on public.challenge_submissions
  for update using (public.is_vault_admin());

-- RPC: submit a challenge
create or replace function public.submit_challenge(
  p_challenge_id uuid,
  p_proof_url    text default null,
  p_proof_text   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_member_id uuid;
  v_challenge record;
begin
  -- Get vault_members id
  select id into v_member_id from vault_members where id = v_uid;
  if v_member_id is null then
    return jsonb_build_object('error', 'Member not found');
  end if;

  -- Validate challenge
  select * into v_challenge from challenges where id = p_challenge_id and is_active = true;
  if v_challenge is null then
    return jsonb_build_object('error', 'Challenge not found or inactive');
  end if;

  -- Insert submission
  insert into challenge_submissions (member_id, challenge_id, proof_url, proof_text)
  values (v_member_id, p_challenge_id, p_proof_url, p_proof_text)
  on conflict (member_id, challenge_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.submit_challenge(uuid, text, text) to authenticated;

-- RPC: admin get submissions
create or replace function public.admin_get_challenge_submissions(p_status text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_vault_admin() then
    return jsonb_build_object('error', 'Not authorized');
  end if;

  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', cs.id,
        'member', vm.username,
        'challenge', c.title,
        'challenge_points', c.points_reward,
        'proof_url', cs.proof_url,
        'proof_text', cs.proof_text,
        'status', cs.status,
        'submitted_at', cs.created_at,
        'review_note', cs.review_note
      ) order by cs.created_at desc
    ), '[]'::jsonb)
    from challenge_submissions cs
    join vault_members vm on vm.id = cs.member_id
    join challenges c on c.id = cs.challenge_id
    where (p_status is null or cs.status = p_status)
  );
end;
$$;

grant execute on function public.admin_get_challenge_submissions(text) to authenticated;
