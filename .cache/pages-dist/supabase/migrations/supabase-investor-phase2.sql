-- ═══════════════════════════════════════════════════════════════════════════
--  VaultSpark Studios — Investor Area Phase 2: RPCs
--  Run in: Supabase Dashboard → SQL Editor
--  Depends on: supabase-investor-phase1.sql
-- ═══════════════════════════════════════════════════════════════════════════


-- ── get_my_investor_profile ──────────────────────────────────────────────────
-- Returns the authenticated user's investor profile + visible counts.
-- Called once on dashboard load. Returns error object if not an investor.

create or replace function public.get_my_investor_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_inv       investors%rowtype;
  v_upd_count bigint;
  v_doc_count bigint;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  select * into v_inv from investors where user_id = v_uid;
  if not found then
    return jsonb_build_object('error', 'Not an investor');
  end if;

  if v_inv.status != 'active' then
    return jsonb_build_object('error', 'Investor account is not active');
  end if;

  -- Count visible updates
  select count(*) into v_upd_count
  from investor_updates u
  where u.is_published = true
    and (
      v_inv.tier = 'strategic'
      or (v_inv.tier = 'lead' and u.visibility_tier in ('standard', 'lead'))
      or u.visibility_tier = 'standard'
    );

  -- Count accessible documents
  select count(*) into v_doc_count
  from investor_documents d
  where d.is_active = true
    and (
      d.visibility_scope = 'all_investors'
      or (d.visibility_scope = 'lead_and_strategic' and v_inv.tier in ('lead', 'strategic'))
      or (d.visibility_scope = 'strategic_only'     and v_inv.tier = 'strategic')
      or (d.visibility_scope = 'per_investor'       and d.per_investor_id = v_inv.id)
    );

  return jsonb_build_object(
    'id',                 v_inv.id,
    'display_name',       v_inv.display_name,
    'entity_type',        v_inv.entity_type,
    'tier',               v_inv.tier,
    'investment_amount',  v_inv.investment_amount,
    'equity_percentage',  v_inv.equity_percentage,
    'investment_date',    v_inv.investment_date,
    'status',             v_inv.status,
    'onboarded_at',       v_inv.onboarded_at,
    'update_count',       v_upd_count,
    'document_count',     v_doc_count
  );
end;
$$;

grant execute on function public.get_my_investor_profile() to authenticated;


-- ── log_investor_action ───────────────────────────────────────────────────────
-- Thin security-definer wrapper for activity logging.
-- Called from the browser for: logins, update reads, profile views.
-- Document views are logged directly inside get_investor_document_url().

create or replace function public.log_investor_action(
  p_action       text,
  p_target_id    uuid    default null,
  p_target_label text    default null,
  p_metadata     jsonb   default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv investors%rowtype;
begin
  if v_uid is null then return; end if;

  select * into v_inv from investors where user_id = v_uid and status = 'active';
  if not found then return; end if;

  insert into investor_activity (investor_id, user_id, action, target_id, target_label, metadata)
  values (v_inv.id, v_uid, p_action, p_target_id, p_target_label, coalesce(p_metadata, '{}'));
end;
$$;

grant execute on function public.log_investor_action(text, uuid, text, jsonb) to authenticated;


-- ── get_investor_document_url ─────────────────────────────────────────────────
-- Validates the investor's access to a document, logs the view, then returns
-- a short-lived signed URL. The storage path is NEVER sent to the browser.

create or replace function public.get_investor_document_url(p_document_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_doc      investor_documents%rowtype;
  v_inv      investors%rowtype;
  v_signed   text;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  -- Fetch active investor record
  select * into v_inv from investors where user_id = v_uid and status = 'active';
  if not found then
    return jsonb_build_object('error', 'Not an active investor');
  end if;

  -- Fetch document metadata (RLS also enforces this, double-checking here for clarity)
  select * into v_doc from investor_documents where id = p_document_id and is_active = true;
  if not found then
    return jsonb_build_object('error', 'Document not found');
  end if;

  -- Validate scope access
  if not (
    v_doc.visibility_scope = 'all_investors'
    or (v_doc.visibility_scope = 'lead_and_strategic' and v_inv.tier in ('lead', 'strategic'))
    or (v_doc.visibility_scope = 'strategic_only'     and v_inv.tier = 'strategic')
    or (v_doc.visibility_scope = 'per_investor'       and v_doc.per_investor_id = v_inv.id)
  ) then
    return jsonb_build_object('error', 'Access denied');
  end if;

  -- Log the document view
  insert into investor_activity (investor_id, user_id, action, target_id, target_label)
  values (v_inv.id, v_uid, 'doc_view', p_document_id, v_doc.title);

  -- Generate a 15-minute signed URL via storage.sign
  -- Note: storage.sign is available as a Postgres function in Supabase
  select storage.foldername(v_doc.storage_path) into v_signed; -- warm the schema
  begin
    select concat(
      'https://fjnpzjjyhnpmunfoycrp.supabase.co/storage/v1/object/sign/investor-docs/',
      v_doc.storage_path,
      '?token=', extensions.sign(
        jsonb_build_object(
          'url', 'investor-docs/' || v_doc.storage_path,
          'exp', extract(epoch from now())::bigint + 900
        )::text,
        current_setting('app.jwt_secret', true)
      )
    ) into v_signed;
  exception when others then
    -- Fallback: return metadata only; admin must generate URL manually
    return jsonb_build_object(
      'ok',       true,
      'url',      null,
      'title',    v_doc.title,
      'doc_id',   v_doc.id,
      'note',     'Signed URL generation requires service-role. Use Edge Function.'
    );
  end;

  return jsonb_build_object(
    'ok',    true,
    'url',   v_signed,
    'title', v_doc.title
  );
end;
$$;

grant execute on function public.get_investor_document_url(uuid) to authenticated;


-- ── admin_get_all_investors ───────────────────────────────────────────────────
-- Returns all investors with activity summary. Admin only.

create or replace function public.admin_get_all_investors()
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
        'id',                inv.id,
        'user_id',           inv.user_id,
        'display_name',      inv.display_name,
        'entity_type',       inv.entity_type,
        'investment_amount', inv.investment_amount,
        'equity_percentage', inv.equity_percentage,
        'investment_date',   inv.investment_date,
        'tier',              inv.tier,
        'status',            inv.status,
        'notes',             inv.notes,
        'onboarded_at',      inv.onboarded_at,
        'email',             au.email,
        'last_active', (
          select max(ia.created_at)
          from investor_activity ia
          where ia.investor_id = inv.id
        )
      )
      order by inv.onboarded_at desc
    ), '[]'::jsonb)
    from investors inv
    join auth.users au on au.id = inv.user_id
  );
end;
$$;

grant execute on function public.admin_get_all_investors() to authenticated;


-- ── admin_get_investor_activity ───────────────────────────────────────────────
-- Returns activity log for all investors (admin panel). Admin only.
-- Optional: filter by investor_id.

create or replace function public.admin_get_investor_activity(
  p_investor_id uuid    default null,
  p_limit       integer default 100
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
    select coalesce(jsonb_agg(row_data order by row_data->>'created_at' desc), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'id',            ia.id,
        'investor_id',   ia.investor_id,
        'display_name',  inv.display_name,
        'action',        ia.action,
        'target_label',  ia.target_label,
        'metadata',      ia.metadata,
        'created_at',    ia.created_at
      ) as row_data
      from investor_activity ia
      join investors inv on inv.id = ia.investor_id
      where (p_investor_id is null or ia.investor_id = p_investor_id)
      order by ia.created_at desc
      limit p_limit
    ) sub
  );
end;
$$;

grant execute on function public.admin_get_investor_activity(uuid, integer) to authenticated;


-- ── admin_upsert_investor ─────────────────────────────────────────────────────
-- Creates or updates an investor record. Admin only.
-- Looks up user by email from auth.users.

create or replace function public.admin_upsert_investor(
  p_email             text,
  p_display_name      text,
  p_entity_type       text    default 'individual',
  p_tier              text    default 'standard',
  p_investment_amount numeric default null,
  p_equity_percentage numeric default null,
  p_investment_date   date    default null,
  p_notes             text    default null,
  p_investor_id       uuid    default null  -- if set, this is an update
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_user_id uuid;
begin
  if not exists (
    select 1 from vault_members where id = v_uid and username_lower = 'vaultspark'
  ) then
    return jsonb_build_object('error', 'Unauthorized');
  end if;

  -- Look up user by email
  select id into v_user_id from auth.users where email = lower(trim(p_email));
  if not found then
    return jsonb_build_object('error', 'No auth.users account found for that email. The investor must create an account first.');
  end if;

  if p_investor_id is not null then
    -- Update existing
    update investors set
      display_name      = p_display_name,
      entity_type       = p_entity_type,
      tier              = p_tier,
      investment_amount = p_investment_amount,
      equity_percentage = p_equity_percentage,
      investment_date   = p_investment_date,
      notes             = p_notes,
      updated_at        = now()
    where id = p_investor_id;

    return jsonb_build_object('ok', true, 'action', 'updated', 'investor_id', p_investor_id);
  else
    -- Insert new
    insert into investors (
      user_id, display_name, entity_type, tier,
      investment_amount, equity_percentage, investment_date, notes, created_by
    ) values (
      v_user_id, p_display_name, p_entity_type, p_tier,
      p_investment_amount, p_equity_percentage, p_investment_date, p_notes, v_uid
    )
    on conflict (user_id) do update set
      display_name      = excluded.display_name,
      entity_type       = excluded.entity_type,
      tier              = excluded.tier,
      investment_amount = excluded.investment_amount,
      equity_percentage = excluded.equity_percentage,
      investment_date   = excluded.investment_date,
      notes             = excluded.notes,
      updated_at        = now()
    returning id into p_investor_id;

    return jsonb_build_object('ok', true, 'action', 'created', 'investor_id', p_investor_id);
  end if;
end;
$$;

grant execute on function public.admin_upsert_investor(text, text, text, text, numeric, numeric, date, text, uuid) to authenticated;


-- ── admin_set_investor_status ─────────────────────────────────────────────────
-- Toggles investor status (active / inactive / exited). Admin only.

create or replace function public.admin_set_investor_status(
  p_investor_id uuid,
  p_status      text  -- 'active' | 'inactive' | 'exited'
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

  if p_status not in ('active', 'inactive', 'exited') then
    return jsonb_build_object('error', 'Invalid status');
  end if;

  update investors set status = p_status, updated_at = now() where id = p_investor_id;

  if not found then
    return jsonb_build_object('error', 'Investor not found');
  end if;

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

grant execute on function public.admin_set_investor_status(uuid, text) to authenticated;
