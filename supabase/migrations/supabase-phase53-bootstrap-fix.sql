-- Phase 53 — bootstrap RPC fix
-- Removes a stale last_seen update from get_member_bootstrap().

create or replace function public.get_member_bootstrap()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_member jsonb;
  v_events jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  select to_jsonb(m) into v_member
  from public.vault_members m
  where m.id = v_uid;

  if v_member is null then
    return jsonb_build_object('error', 'no_member');
  end if;

  select jsonb_agg(e order by e.created_at desc) into v_events
  from (
    select label, points, created_at
    from public.point_events
    where user_id = v_uid
    order by created_at desc
    limit 8
  ) e;

  return jsonb_build_object(
    'member', v_member,
    'events', coalesce(v_events, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_member_bootstrap() to authenticated;
