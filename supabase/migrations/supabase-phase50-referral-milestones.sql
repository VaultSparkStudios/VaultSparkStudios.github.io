-- ══════════════════════════════════════════════════════════════
-- Phase 50 — Referral Milestone Rewards
-- ══════════════════════════════════════════════════════════════

-- ── Referral milestone definitions ──────────────────────────
create table if not exists public.referral_milestones (
  id          serial      primary key,
  threshold   int         not null unique,
  reward_type text        not null,   -- 'points', 'achievement', 'avatar', 'badge', 'title'
  reward_value text       not null,   -- e.g. '500' for points, 'recruiter-elite' for badge id
  label       text        not null,
  description text        not null,
  icon        text        not null default '🏆',
  created_at  timestamptz default now()
);

alter table public.referral_milestones enable row level security;
drop policy if exists "Anyone can read milestone definitions" on public.referral_milestones;
create policy "Anyone can read milestone definitions"
  on public.referral_milestones for select using (true);

-- ── Seed milestone tiers ────────────────────────────────────
insert into public.referral_milestones (threshold, reward_type, reward_value, label, description, icon) values
  (1,  'achievement', 'referral_1',       'First Recruit',      'Invited your first member to the Vault',           '🤝'),
  (3,  'points',      '500',              'Growing Network',    'Earn 500 bonus Vault Points',                      '🌱'),
  (5,  'achievement', 'referral_5',       'Vault Patron',       'Achievement unlocked + exclusive Patron avatar',   '👑'),
  (10, 'badge',       'recruiter-elite',  'Elite Recruiter',    'Exclusive badge + custom Recruiter title',         '⚡'),
  (25, 'title',       'legendary',        'Legendary Recruiter','Legendary recruiter status + 2,500 bonus points',  '🔥')
on conflict (threshold) do nothing;

-- ── Track claimed milestones per member ─────────────────────
create table if not exists public.vault_member_milestones (
  id           serial      primary key,
  member_id    uuid        references auth.users(id) on delete cascade not null,
  milestone_id int         references public.referral_milestones(id) not null,
  claimed_at   timestamptz default now(),
  unique(member_id, milestone_id)
);

alter table public.vault_member_milestones enable row level security;

drop policy if exists "Members can view own milestones" on public.vault_member_milestones;
create policy "Members can view own milestones"
  on public.vault_member_milestones for select
  using (auth.uid() = member_id);

drop policy if exists "Members can claim own milestones" on public.vault_member_milestones;
create policy "Members can claim own milestones"
  on public.vault_member_milestones for insert
  with check (auth.uid() = member_id);

-- ── RPC: Get referral count + milestone status ──────────────
create or replace function public.get_referral_milestones(p_user_id uuid)
returns json as $$
declare
  v_referral_count int;
  v_milestones     json;
begin
  -- Count referrals: invite_codes where created_by = user AND used_by IS NOT NULL
  select count(*) into v_referral_count
  from public.invite_codes
  where created_by = p_user_id
    and used_by is not null;

  -- Get milestone definitions with claimed status
  select json_agg(row_to_json(t) order by t.threshold) into v_milestones
  from (
    select
      rm.id,
      rm.threshold,
      rm.reward_type,
      rm.reward_value,
      rm.label,
      rm.description,
      rm.icon,
      exists(
        select 1 from public.vault_member_milestones vmm
        where vmm.member_id = p_user_id and vmm.milestone_id = rm.id
      ) as claimed
    from public.referral_milestones rm
  ) t;

  return json_build_object(
    'referral_count', v_referral_count,
    'milestones', coalesce(v_milestones, '[]'::json)
  );
end;
$$ language plpgsql security definer;

-- ── RPC: Claim a milestone reward ───────────────────────────
create or replace function public.claim_referral_milestone(p_milestone_id int)
returns json as $$
declare
  v_user_id        uuid := auth.uid();
  v_milestone      public.referral_milestones%rowtype;
  v_referral_count int;
begin
  if v_user_id is null then
    return json_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  -- Get milestone
  select * into v_milestone from public.referral_milestones where id = p_milestone_id;
  if not found then
    return json_build_object('ok', false, 'error', 'Milestone not found');
  end if;

  -- Check not already claimed
  if exists(select 1 from public.vault_member_milestones where member_id = v_user_id and milestone_id = p_milestone_id) then
    return json_build_object('ok', false, 'error', 'Already claimed');
  end if;

  -- Check referral count meets threshold
  select count(*) into v_referral_count
  from public.invite_codes
  where created_by = v_user_id and used_by is not null;

  if v_referral_count < v_milestone.threshold then
    return json_build_object('ok', false, 'error', 'Not enough referrals');
  end if;

  -- Claim it
  insert into public.vault_member_milestones (member_id, milestone_id) values (v_user_id, p_milestone_id);

  -- Award points if reward_type is 'points' or 'title' (legendary gets 2500)
  if v_milestone.reward_type = 'points' then
    insert into public.point_events (user_id, points, reason)
    values (v_user_id, v_milestone.reward_value::int, 'milestone_' || v_milestone.label);

    update public.vault_members
    set points = points + v_milestone.reward_value::int
    where id = v_user_id;
  end if;

  if v_milestone.reward_type = 'title' then
    -- Legendary tier: award 2500 points
    insert into public.point_events (user_id, points, reason)
    values (v_user_id, 2500, 'milestone_legendary_recruiter');

    update public.vault_members
    set points = points + 2500
    where id = v_user_id;
  end if;

  return json_build_object('ok', true, 'milestone', v_milestone.label);
end;
$$ language plpgsql security definer;
