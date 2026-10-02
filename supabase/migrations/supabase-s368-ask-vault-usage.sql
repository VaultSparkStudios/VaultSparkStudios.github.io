-- ═══════════════════════════════════════════════════════════════════════════
-- S368 ask-the-vault: per-request usage log for the grounded answer endpoint
-- (supabase/functions/semantic-search, "Ask the Vault").
--
-- ignis_daily_meter keeps one aggregate row per function per day, which is the
-- right shape for the spend cap but cannot answer "what does one answer cost?"
-- or "how often does the lexical gate save a model call?". This table records
-- one row per request with token counts, passages sent and the outcome.
--
-- Privacy: no query text, no IP, no user id, no answer text. Only counts,
-- the model id, the corpus version and the retrieval scores.
--
-- Service role only (the edge function writes with the service key). Public
-- readers get nothing; the daily view is for the operator dashboard.
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.ask_vault_usage (
  id                  bigserial   primary key,
  created_at          timestamptz not null default now(),
  outcome             text        not null check (outcome in (
                        'answer', 'model_no_answer', 'no_answer_short_circuit',
                        'cache_hit', 'capped', 'upstream_error')),
  model               text,
  input_tokens        integer     not null default 0,
  output_tokens       integer     not null default 0,
  cache_read_tokens   integer     not null default 0,
  cache_create_tokens integer     not null default 0,
  passages_sent       smallint    not null default 0,
  grounding_chars     integer     not null default 0,
  corpus_passages     smallint    not null default 0,
  corpus_version      text,
  top_score           numeric(8,3) not null default 0,
  coverage            numeric(5,3) not null default 0,
  usd_estimate        numeric(12,6) not null default 0
);

create index if not exists ask_vault_usage_created_idx
  on public.ask_vault_usage (created_at desc);

alter table public.ask_vault_usage enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS) may touch it.
revoke all on table public.ask_vault_usage from anon;
revoke all on table public.ask_vault_usage from authenticated;
grant select, insert on table public.ask_vault_usage to service_role;
grant usage, select on sequence public.ask_vault_usage_id_seq to service_role;

-- 90-day retention, swept at most once per insert statement.
create or replace function public.ask_vault_usage_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.ask_vault_usage where created_at < now() - interval '90 days';
  return null;
end;
$$;

revoke execute on function public.ask_vault_usage_cleanup() from public, anon, authenticated;

drop trigger if exists ask_vault_usage_cleanup_trg on public.ask_vault_usage;
create trigger ask_vault_usage_cleanup_trg
  after insert on public.ask_vault_usage
  for each statement execute function public.ask_vault_usage_cleanup();

-- Cost per answer, per day: the before/after comparison the measurement plan reads.
create or replace view public.ask_vault_usage_daily
with (security_invoker = true) as
select
  date_trunc('day', created_at)::date                                   as day,
  count(*)                                                              as requests,
  count(*) filter (where outcome = 'answer')                            as answers,
  count(*) filter (where outcome = 'cache_hit')                         as cache_hits,
  count(*) filter (where outcome = 'no_answer_short_circuit')           as zero_token_no_answers,
  count(*) filter (where outcome = 'model_no_answer')                   as model_no_answers,
  count(*) filter (where outcome in ('capped', 'upstream_error'))       as failures,
  round(avg(input_tokens)  filter (where input_tokens > 0), 1)          as avg_input_tokens,
  round(avg(output_tokens) filter (where output_tokens > 0), 1)         as avg_output_tokens,
  round(avg(passages_sent) filter (where passages_sent > 0), 2)         as avg_passages_sent,
  sum(cache_read_tokens)                                                as cache_read_tokens,
  sum(usd_estimate)                                                     as usd_total,
  round(sum(usd_estimate) / nullif(count(*) filter (where outcome = 'answer'), 0), 6) as usd_per_paid_answer,
  round(sum(usd_estimate) / nullif(count(*), 0), 6)                     as usd_per_request
from public.ask_vault_usage
group by 1
order by 1 desc;

revoke all on public.ask_vault_usage_daily from anon, authenticated;
grant select on public.ask_vault_usage_daily to service_role;
