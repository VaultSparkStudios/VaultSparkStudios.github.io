-- ============================================================
-- Vault Member — Phase 2/3: Points Economy + Referral System
-- Run in Supabase SQL Editor → New Query
-- ============================================================


-- ── Phase 2: point_events table ──────────────────────────────
create table if not exists public.point_events (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  reason     text        not null,   -- machine key, e.g. 'game_visit_cod'
  label      text        not null,   -- human readable, e.g. 'Visited Call of Doodie'
  points     integer     not null,
  created_at timestamptz not null default now()
);

alter table public.point_events enable row level security;

create policy "users read own point_events"
  on public.point_events for select
  using (auth.uid() = user_id);

create index if not exists idx_point_events_user
  on public.point_events (user_id, created_at desc);


-- ── Phase 2: award_points RPC ────────────────────────────────
-- p_once_per: 'ever' = deduplicated forever | 'day' = once per calendar day
create or replace function public.award_points(
  p_reason   text,
  p_points   integer,
  p_label    text    default null,
  p_once_per text    default 'ever'
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid         uuid        := auth.uid();
  v_check_since timestamptz := case p_once_per
    when 'day' then current_date::timestamptz
    else '-infinity'::timestamptz
  end;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  -- Dedup: skip if this reason was already awarded in the window
  if exists (
    select 1 from point_events
    where user_id = v_uid
      and reason  = p_reason
      and created_at >= v_check_since
  ) then
    return jsonb_build_object('skipped', true);
  end if;

  insert into point_events (user_id, reason, label, points)
  values (v_uid, p_reason, coalesce(p_label, p_reason), p_points);

  update vault_members set points = points + p_points where id = v_uid;

  return jsonb_build_object('ok', true, 'points', p_points);
end;
$$;


-- ── Phase 3: add created_by to invite_codes ──────────────────
alter table public.invite_codes
  add column if not exists created_by uuid references auth.users(id);


-- ── Phase 3: personal invite code generator ──────────────────
create or replace function public.get_or_create_my_invite_code()
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_username text;
  v_code     text;
  v_attempt  int  := 0;
begin
  if v_uid is null then return null; end if;

  -- Return existing unused personal code if one already exists
  select code into v_code
  from invite_codes
  where created_by = v_uid and used = false
  order by created_at desc
  limit 1;

  if v_code is not null then return v_code; end if;

  -- Generate a fresh one
  select username into v_username from vault_members where id = v_uid;

  loop
    v_code := 'VAULT-'
      || upper(left(regexp_replace(coalesce(v_username, 'MEMBER'), '[^A-Za-z0-9]', '', 'g'), 6))
      || '-'
      || upper(substring(md5(random()::text || clock_timestamp()::text), 1, 4));
    begin
      insert into invite_codes (code, created_by) values (v_code, v_uid);
      return v_code;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt > 10 then return null; end if;
    end;
  end loop;
end;
$$;


-- ── Phase 3: update register_with_invite (adds referral logic) ─
create or replace function public.register_with_invite(
  p_invite_code text,
  p_username    text,
  p_subscribe   boolean default true
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id      uuid := auth.uid();
  v_code_row     invite_codes%rowtype;
  v_lower        text := lower(trim(p_username));
  v_referral_cnt int;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'Not authenticated.');
  end if;

  select * into v_code_row from invite_codes
  where code = upper(trim(p_invite_code));

  if not found then
    return jsonb_build_object('error', 'Invalid invite code.');
  end if;

  if v_code_row.used then
    return jsonb_build_object('error', 'Invite code has already been used.');
  end if;

  if exists (select 1 from vault_members where username_lower = v_lower) then
    return jsonb_build_object('error', 'That Vault Handle is already taken.');
  end if;

  -- Create vault_members row
  insert into vault_members (id, username, username_lower, points, subscribed, prefs, achievements)
  values (
    v_user_id,
    trim(p_username),
    v_lower,
    10,
    p_subscribe,
    jsonb_build_object('updates', p_subscribe, 'lore', true, 'access', true),
    '[{"id":"joined"}]'::jsonb
  );

  -- Redeem invite code
  update invite_codes
  set used = true, used_by = v_user_id, used_at = now()
  where code = upper(trim(p_invite_code));

  -- ── Referral rewards to inviter ──────────────────────────────
  if v_code_row.created_by is not null and v_code_row.created_by != v_user_id then
    -- Award 100 pts to inviter
    insert into point_events (user_id, reason, label, points)
    values (v_code_row.created_by, 'referral_' || v_user_id::text, 'Vault Referral', 100);

    update vault_members set points = points + 100
    where id = v_code_row.created_by;

    -- Count total successful referrals
    select count(*) into v_referral_cnt
    from invite_codes
    where created_by = v_code_row.created_by and used = true;

    -- Recruiter achievement (1st referral)
    if v_referral_cnt >= 1 then
      update vault_members
      set achievements = achievements || '[{"id":"recruiter"}]'::jsonb
      where id = v_code_row.created_by
        and not (achievements @> '[{"id":"recruiter"}]'::jsonb);
    end if;

    -- Patron achievement (5 referrals)
    if v_referral_cnt >= 5 then
      update vault_members
      set achievements = achievements || '[{"id":"patron"}]'::jsonb
      where id = v_code_row.created_by
        and not (achievements @> '[{"id":"patron"}]'::jsonb);
    end if;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;
