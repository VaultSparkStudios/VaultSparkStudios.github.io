-- page_feedback (P5)
--
-- Receives one row per visitor who taps a 😍/😐/😢 emoji on the rate-this-page
-- widget (assets/rate-page.js). Public-safe — no PII. Anonymized at write time:
-- only path + reaction + visit_depth_bucket + ua_kind.
--
-- Aggregated into a public-readable view (page_feedback_recent) that the
-- /feedback/insights/ page consumes. Optional weekly AI summary written to
-- feedback_summaries by feedback-aggregate edge function.

create table if not exists page_feedback (
  id           bigserial primary key,
  path         text not null,
  reaction     text not null check (reaction in ('useful','ok','not_useful')),
  visit_depth_bucket text check (visit_depth_bucket in ('1','2-4','5-10','10+')),
  ua_kind      text check (ua_kind in ('mobile','desktop')),
  created_at   timestamptz not null default now()
);

create index if not exists page_feedback_path_idx
  on page_feedback (path, created_at desc);

create index if not exists page_feedback_recent_idx
  on page_feedback (created_at desc);

alter table page_feedback enable row level security;

-- Anyone can insert (anonymous public widget). The path is a string column
-- with no auth context — the widget is the only writer in practice.
create policy "anon_insert_page_feedback"
  on page_feedback for insert to anon, authenticated
  with check (true);

-- No anon read of raw rows (per-row paths could expose internal pages).
-- Aggregate view below is the public read surface.
create policy "service_role_read_raw"
  on page_feedback for select
  using (auth.role() = 'service_role');

-- ─── Aggregate view ──────────────────────────────────────────────────────────
-- Rolling 7-day window, grouped by path. Returns counts per reaction so the
-- public dashboard can compute usefulness ratio without seeing individual rows.
create or replace view page_feedback_7d as
select
  path,
  count(*) as total,
  count(*) filter (where reaction = 'useful') as useful_count,
  count(*) filter (where reaction = 'ok') as ok_count,
  count(*) filter (where reaction = 'not_useful') as not_useful_count,
  round(
    100.0 * count(*) filter (where reaction = 'useful') / nullif(count(*), 0),
    1
  ) as useful_pct,
  count(*) filter (where ua_kind = 'mobile') as mobile_count,
  count(*) filter (where ua_kind = 'desktop') as desktop_count,
  count(*) filter (where visit_depth_bucket in ('5-10','10+')) as repeat_visitor_count,
  max(created_at) as last_at
from page_feedback
where created_at > now() - interval '7 days'
group by path
order by total desc;

-- Public read of aggregate view — counts only, no per-row data.
grant select on page_feedback_7d to anon, authenticated;

-- ─── Top blockers / signals (overall) ────────────────────────────────────────
create or replace view page_feedback_signals as
select
  count(*) as total_responses_7d,
  count(*) filter (where reaction = 'useful') as useful_total,
  count(*) filter (where reaction = 'not_useful') as not_useful_total,
  round(100.0 * count(*) filter (where reaction = 'useful') / nullif(count(*),0), 1) as overall_useful_pct,
  count(*) filter (where ua_kind = 'mobile')::int as mobile_responses,
  count(*) filter (where ua_kind = 'desktop')::int as desktop_responses,
  count(*) filter (where visit_depth_bucket = '1')::int as first_visit_responses,
  count(*) filter (where visit_depth_bucket in ('2-4','5-10','10+'))::int as returning_responses,
  round(
    100.0 * count(*) filter (where reaction = 'useful' and visit_depth_bucket in ('2-4','5-10','10+'))
      / nullif(count(*) filter (where visit_depth_bucket in ('2-4','5-10','10+')), 0),
    1
  ) as returning_useful_pct
from page_feedback
where created_at > now() - interval '7 days';

grant select on page_feedback_signals to anon, authenticated;

-- ─── feedback_summaries — weekly AI synthesis ────────────────────────────────
-- Optional: the feedback-aggregate edge function writes a weekly Claude-authored
-- summary here. Keeps ~12 weeks of history. /feedback/insights/ shows the latest.
create table if not exists feedback_summaries (
  id            bigserial primary key,
  week_start    date not null,
  summary       text not null,
  total_signals integer not null,
  model         text not null,
  created_at    timestamptz not null default now()
);

create unique index if not exists feedback_summaries_week_idx
  on feedback_summaries (week_start);

alter table feedback_summaries enable row level security;

create policy "anon_read_summaries"
  on feedback_summaries for select
  using (true);

create policy "service_role_write_summaries"
  on feedback_summaries for all
  using (auth.role() = 'service_role');
