-- S289 recovery — repair the live classified-archive RPC and preserve
-- entitlement inheritance for the Eternal tier.
--
-- Rollback: re-apply the immediately preceding definitions from
-- supabase-phase52-membership-entitlements.sql at the prior commit.

create or replace function public.get_classified_files()
returns table (
  id              uuid,
  slug            text,
  title           text,
  classification  text,
  rank_required   integer,
  required_plan   text,
  universe_tag    text,
  content_html    text,
  published_at    timestamptz,
  locked          boolean
)
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid       uuid    := auth.uid();
  v_rank_idx  integer := 0;
  v_plan      text    := 'free';
begin
  if v_uid is null then return; end if;

  select case
    when vm.points >= 100000 then 8
    when vm.points >= 60000  then 7
    when vm.points >= 30000  then 6
    when vm.points >= 15000  then 5
    when vm.points >= 7500   then 4
    when vm.points >= 3000   then 3
    when vm.points >= 1000   then 2
    when vm.points >= 250    then 1
    else 0 end
  into v_rank_idx
  from public.vault_members vm
  where vm.id = v_uid;

  select case
    when s.status = 'active' and (s.current_period_end is null or s.current_period_end > now())
      then case when s.plan = 'pro' then 'promogrind_pro' else coalesce(s.plan, 'free') end
    else 'free'
  end
  into v_plan
  from public.subscriptions s
  where s.user_id = v_uid;

  v_plan := coalesce(v_plan, 'free');

  return query
    select
      f.id,
      f.slug,
      f.title,
      f.classification,
      f.rank_required,
      f.required_plan,
      f.universe_tag,
      case when
        f.rank_required <= v_rank_idx
        and (
          f.required_plan = 'free'
          or (f.required_plan = 'vault_sparked' and v_plan in ('vault_sparked', 'vault_sparked_pro'))
          or (f.required_plan = 'promogrind_pro' and v_plan in ('promogrind_pro', 'vault_sparked', 'vault_sparked_pro'))
        )
      then f.content_html
      else ''::text end as content_html,
      f.published_at,
      not (
        f.rank_required <= v_rank_idx
        and (
          f.required_plan = 'free'
          or (f.required_plan = 'vault_sparked' and v_plan in ('vault_sparked', 'vault_sparked_pro'))
          or (f.required_plan = 'promogrind_pro' and v_plan in ('promogrind_pro', 'vault_sparked', 'vault_sparked_pro'))
        )
      ) as locked
    from public.classified_files f
    where f.published_at is not null
    order by f.rank_required asc, f.published_at desc;
end;
$$;

drop policy if exists "members see claimable or own keys" on public.beta_keys;
create policy "members see claimable or own keys"
  on public.beta_keys for select
  to authenticated
  using (
    claimed_by = auth.uid()
    or (
      claimed_by is null
      and min_rank <= (
        select case
          when vm.points >= 100000 then 8
          when vm.points >= 60000  then 7
          when vm.points >= 30000  then 6
          when vm.points >= 15000  then 5
          when vm.points >= 7500   then 4
          when vm.points >= 3000   then 3
          when vm.points >= 1000   then 2
          when vm.points >= 250    then 1
          else 0
        end
        from public.vault_members vm
        where vm.id = auth.uid()
      )
      and (
        required_plan = 'free'
        or (
          required_plan = 'vault_sparked'
          and exists (
            select 1
            from public.subscriptions s
            where s.user_id = auth.uid()
              and s.status = 'active'
              and (s.current_period_end is null or s.current_period_end > now())
              and s.plan in ('vault_sparked', 'vault_sparked_pro')
          )
        )
        or (
          required_plan = 'promogrind_pro'
          and exists (
            select 1
            from public.subscriptions s
            where s.user_id = auth.uid()
              and s.status = 'active'
              and (s.current_period_end is null or s.current_period_end > now())
              and s.plan in ('promogrind_pro', 'pro', 'vault_sparked', 'vault_sparked_pro')
          )
        )
      )
    )
  );

create or replace function public.claim_beta_key(p_game_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_rank  integer;
  v_member_plan  text;
  v_key_id       uuid;
  v_key_code     text;
  v_already      text;
begin
  select case
    when vm.points >= 100000 then 8
    when vm.points >= 60000  then 7
    when vm.points >= 30000  then 6
    when vm.points >= 15000  then 5
    when vm.points >= 7500   then 4
    when vm.points >= 3000   then 3
    when vm.points >= 1000   then 2
    when vm.points >= 250    then 1
    else 0
  end
  into v_member_rank
  from public.vault_members vm
  where vm.id = auth.uid();

  if not found then
    return jsonb_build_object('error', 'member_not_found');
  end if;

  select case
    when s.status = 'active' and (s.current_period_end is null or s.current_period_end > now())
      then case when s.plan = 'pro' then 'promogrind_pro' else coalesce(s.plan, 'free') end
    else 'free'
  end
  into v_member_plan
  from public.subscriptions s
  where s.user_id = auth.uid();

  v_member_plan := coalesce(v_member_plan, 'free');

  select bk.key_code into v_already
  from public.beta_keys bk
  where bk.game_slug = p_game_slug
    and bk.claimed_by = auth.uid()
  limit 1;

  if found then
    return jsonb_build_object('ok', true, 'key_code', v_already, 'already_claimed', true);
  end if;

  select bk.id, bk.key_code
  into v_key_id, v_key_code
  from public.beta_keys bk
  where bk.game_slug = p_game_slug
    and bk.claimed_by is null
    and bk.min_rank <= v_member_rank
    and (
      bk.required_plan = 'free'
      or (bk.required_plan = 'vault_sparked' and v_member_plan in ('vault_sparked', 'vault_sparked_pro'))
      or (bk.required_plan = 'promogrind_pro' and v_member_plan in ('promogrind_pro', 'vault_sparked', 'vault_sparked_pro'))
    )
  order by bk.created_at
  limit 1
  for update skip locked;

  if not found then
    return jsonb_build_object('error', 'no_keys_available');
  end if;

  update public.beta_keys
  set claimed_by = auth.uid(),
      claimed_at = now()
  where beta_keys.id = v_key_id;

  return jsonb_build_object('ok', true, 'key_code', v_key_code);
end;
$$;
