-- ─────────────────────────────────────────────────────────────────
-- Phase 1 — Member Numbers
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- 1. Add the column
alter table public.vault_members
  add column if not exists member_number integer unique;

-- 2. Create a sequence (starts at 1)
create sequence if not exists vault_member_number_seq start 1;

-- 3. Trigger function: assigns the next number on every new member insert
create or replace function public.assign_member_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.member_number := nextval('vault_member_number_seq');
  return new;
end;
$$;

-- 4. Attach trigger
drop trigger if exists before_insert_vault_member_number on public.vault_members;
create trigger before_insert_vault_member_number
  before insert on public.vault_members
  for each row execute function public.assign_member_number();

-- 5. Backfill existing members in join order
with ordered as (
  select id, row_number() over (order by created_at asc) as rn
  from public.vault_members
  where member_number is null
)
update public.vault_members vm
set member_number = o.rn
from ordered o
where vm.id = o.id;

-- 6. Advance the sequence past the highest assigned number
select setval(
  'vault_member_number_seq',
  coalesce((select max(member_number) from public.vault_members), 0)
);
