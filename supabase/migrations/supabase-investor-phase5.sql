-- ═══════════════════════════════════════════════════════════════════════════
--  VaultSpark Studios — Investor Area Phase 5: Messaging
--  Run in: Supabase Dashboard → SQL Editor
--  Depends on: supabase-investor-phase1.sql, supabase-investor-phase2.sql
-- ═══════════════════════════════════════════════════════════════════════════


-- ── investor_messages table ───────────────────────────────────────────────────

create table public.investor_messages (
  id          uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.investors(id) on delete cascade,
  subject     text not null,
  priority    text not null default 'general', -- 'general' | 'urgent' | 'question'
  message     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.investor_messages enable row level security;

-- Investor can INSERT their own messages
create policy "investor can send message"
  on public.investor_messages
  for insert
  to authenticated
  with check (
    investor_id = (
      select id from public.investors where user_id = auth.uid()
    )
  );

-- Admin reads all
create policy "admin reads messages"
  on public.investor_messages
  for select
  to authenticated
  using (
    auth.uid() = (
      select id from public.vault_members where username_lower = 'vaultspark'
    )
  );

-- Admin updates (mark read)
create policy "admin updates messages"
  on public.investor_messages
  for update
  to authenticated
  using (
    auth.uid() = (
      select id from public.vault_members where username_lower = 'vaultspark'
    )
  );


-- ── send_investor_message ─────────────────────────────────────────────────────
-- Called by investors to send a direct message to the studio.
-- Inserts into investor_messages and logs to investor_activity.

create or replace function public.send_investor_message(
  p_subject  text,
  p_priority text default 'general',
  p_message  text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_inv        investors%rowtype;
  v_message_id uuid;
  v_preview    text;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  -- Validate investor
  select * into v_inv from investors where user_id = v_uid and status = 'active';
  if not found then
    return jsonb_build_object('error', 'Not an active investor');
  end if;

  -- Validate inputs
  if trim(p_subject) = '' then
    return jsonb_build_object('error', 'Subject is required');
  end if;

  if trim(p_message) = '' then
    return jsonb_build_object('error', 'Message body is required');
  end if;

  if p_priority not in ('general', 'urgent', 'question') then
    return jsonb_build_object('error', 'Invalid priority — must be general, urgent, or question');
  end if;

  -- Insert message
  insert into investor_messages (investor_id, subject, priority, message)
  values (v_inv.id, trim(p_subject), p_priority, trim(p_message))
  returning id into v_message_id;

  -- Build a short preview for the activity log (first 120 chars)
  v_preview := left(trim(p_message), 120);
  if length(trim(p_message)) > 120 then
    v_preview := v_preview || '…';
  end if;

  -- Log to investor_activity
  insert into investor_activity (investor_id, user_id, action, target_id, target_label, metadata)
  values (
    v_inv.id,
    v_uid,
    'founder_message',
    v_message_id,
    trim(p_subject),
    jsonb_build_object(
      'subject',          trim(p_subject),
      'priority',         p_priority,
      'message_preview',  v_preview
    )
  );

  return jsonb_build_object('ok', true, 'message_id', v_message_id);
end;
$$;

grant execute on function public.send_investor_message(text, text, text) to authenticated;


-- ── admin_get_investor_messages ───────────────────────────────────────────────
-- Returns all investor messages with investor display_name and email.
-- Admin only.

create or replace function public.admin_get_investor_messages(
  p_unread_only boolean default false
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
    select coalesce(jsonb_agg(row_data order by (row_data->>'created_at') desc), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'id',           msg.id,
        'investor_id',  msg.investor_id,
        'display_name', inv.display_name,
        'email',        au.email,
        'subject',      msg.subject,
        'priority',     msg.priority,
        'message',      msg.message,
        'read',         msg.read,
        'created_at',   msg.created_at
      ) as row_data
      from investor_messages msg
      join investors inv on inv.id = msg.investor_id
      join auth.users au  on au.id  = inv.user_id
      where (not p_unread_only or msg.read = false)
      order by msg.created_at desc
    ) sub
  );
end;
$$;

grant execute on function public.admin_get_investor_messages(boolean) to authenticated;


-- ── get_investor_message_count ────────────────────────────────────────────────
-- Returns count of unread messages. Admin use only.

create or replace function public.get_investor_message_count()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_unread     bigint;
  v_total      bigint;
begin
  if not exists (
    select 1 from vault_members where id = v_uid and username_lower = 'vaultspark'
  ) then
    return jsonb_build_object('error', 'Unauthorized');
  end if;

  select count(*) into v_total  from investor_messages;
  select count(*) into v_unread from investor_messages where read = false;

  return jsonb_build_object(
    'total',  v_total,
    'unread', v_unread
  );
end;
$$;

grant execute on function public.get_investor_message_count() to authenticated;
