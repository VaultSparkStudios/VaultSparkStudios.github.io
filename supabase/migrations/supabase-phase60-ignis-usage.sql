-- IGNIS monthly usage tracking
-- Supports Sparked monthly quota enforcement while keeping Eternal unlimited.

create table if not exists ignis_usage_monthly (
  id              bigserial primary key,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  month_bucket    text        not null,
  request_count   integer     not null default 0,
  last_request_at timestamptz not null default now(),
  last_model      text,
  plan_key        text        not null default 'free',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint ignis_usage_monthly_user_month_unique unique (user_id, month_bucket)
);

create index if not exists ignis_usage_monthly_user_idx
  on ignis_usage_monthly (user_id, month_bucket);

alter table ignis_usage_monthly enable row level security;

create policy "member_read_own_ignis_usage"
  on ignis_usage_monthly for select
  using (auth.uid() = user_id);

create policy "service_manage_ignis_usage"
  on ignis_usage_monthly for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function set_ignis_usage_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ignis_usage_monthly_updated_at on ignis_usage_monthly;
create trigger ignis_usage_monthly_updated_at
before update on ignis_usage_monthly
for each row
execute function set_ignis_usage_updated_at();
