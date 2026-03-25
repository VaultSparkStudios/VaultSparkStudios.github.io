-- ─────────────────────────────────────────────────────────────
-- Phase 6: Activity Chronicle
-- Run this in the Supabase SQL Editor (project: fjnpzjjyhnpmunfoycrp)
-- ─────────────────────────────────────────────────────────────

-- RPC: get_activity_timeline
-- Returns a unified, reverse-chronological activity feed for the
-- authenticated user, merging point_events (non-challenge) and
-- challenge_completions. The "Joined the Vault" anchor row is
-- appended client-side using vault_members.created_at.
--
-- Columns returned:
--   type        text   — 'challenge' | 'file' | 'game' | 'subscribed'
--                        | 'profile' | 'referral' | 'points'
--   label       text   — human-readable description
--   points      int    — vault points associated with the event (0 if none)
--   occurred_at timestamptz

create or replace function public.get_activity_timeline(p_limit int default 50)
returns table(
  type        text,
  label       text,
  points      int,
  occurred_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  -- Non-challenge point events, classified by reason prefix
  select
    case
      when pe.reason like 'file_read_%'    then 'file'
      when pe.reason like 'game_visit_%'   then 'game'
      when pe.reason like 'referral_%'     then 'referral'
      when pe.reason = 'subscribed'        then 'subscribed'
      when pe.reason in ('bio_set', 'avatar_customized') then 'profile'
      else 'points'
    end                 as type,
    coalesce(pe.label, pe.reason) as label,
    pe.points           as points,
    pe.created_at       as occurred_at
  from point_events pe
  where pe.user_id = auth.uid()
    and pe.reason not like 'challenge_%'

  union all

  -- Challenge completions (deduplicated from point_events above)
  select
    'challenge'         as type,
    c.title             as label,
    c.points            as points,
    cc.completed_at     as occurred_at
  from challenge_completions cc
  join challenges c on c.id = cc.challenge_id
  where cc.user_id = auth.uid()

  order by occurred_at desc
  limit p_limit;
$$;

-- Grant execute to authenticated users
grant execute on function public.get_activity_timeline(int) to authenticated;
