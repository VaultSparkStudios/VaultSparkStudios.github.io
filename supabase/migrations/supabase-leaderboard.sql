-- VaultSpark Studios — Leaderboard RPC
-- Run in: Supabase Dashboard → SQL Editor

create or replace function public.get_leaderboard(p_limit int default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'username', username,
        'points', points,
        'created_at', created_at
      )
      order by points desc
    ), '[]'::jsonb)
    from (
      select username, points, created_at
      from vault_members
      order by points desc
      limit p_limit
    ) t
  );
end;
$$;

grant execute on function public.get_leaderboard(int) to anon, authenticated;
