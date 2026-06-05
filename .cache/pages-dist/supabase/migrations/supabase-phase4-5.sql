-- ============================================================
-- Vault Member — Phase 4/5: Classified Files + Vault Challenges
-- Run in Supabase SQL Editor → New Query
-- ============================================================


-- ── Phase 4: classified_files table ──────────────────────────

create table if not exists public.classified_files (
  id              uuid        primary key default gen_random_uuid(),
  slug            text        unique not null,
  title           text        not null,
  classification  text        not null default 'CLASSIFIED',
  rank_required   integer     not null default 0,
  universe_tag    text,
  content_html    text        not null,
  published_at    timestamptz default now(),
  created_at      timestamptz default now()
);

alter table public.classified_files enable row level security;

create policy "vault members read files"
  on public.classified_files for select
  using (auth.uid() in (select id from public.vault_members));


-- ── Phase 4: get_classified_files RPC ────────────────────────
-- Returns all published files; content_html is empty for locked files.
-- rank_required: 0=all, 1=Vault Runner(100+), 2=Forge Guard(500+),
--                3=Vault Keeper(2000+), 4=The Sparked(10000+)

create or replace function public.get_classified_files()
returns table (
  id              uuid,
  slug            text,
  title           text,
  classification  text,
  rank_required   integer,
  universe_tag    text,
  content_html    text,
  published_at    timestamptz,
  locked          boolean
)
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid      uuid    := auth.uid();
  v_rank_idx integer := 0;
begin
  if v_uid is null then return; end if;

  select case
    when points >= 10000 then 4
    when points >= 2000  then 3
    when points >= 500   then 2
    when points >= 100   then 1
    else 0 end
  into v_rank_idx
  from vault_members where id = v_uid;

  return query
    select
      f.id,
      f.slug,
      f.title,
      f.classification,
      f.rank_required,
      f.universe_tag,
      case when f.rank_required <= v_rank_idx
           then f.content_html
           else ''::text end as content_html,
      f.published_at,
      (f.rank_required > v_rank_idx) as locked
    from classified_files f
    where f.published_at is not null
    order by f.rank_required asc, f.published_at desc;
end;
$$;


-- ── Phase 4: seed classified files ───────────────────────────

insert into public.classified_files
  (slug, title, classification, rank_required, universe_tag, content_html)
values (
  'the-cartographers',
  'The Cartographers',
  'EYES ONLY',
  0,
  'dreadspike',
  '<p>Three months after DreadSpike''s first confirmed manifestation, the Vault dispatched a mapping team. Seven analysts. Equipped with standard containment tools and a mandate to chart the entity''s perimeter — define its edges, establish a boundary layer.</p>
<p>None of them found an edge.</p>
<p>The team reported back for five consecutive days. Standard briefings. Clean data. On day six, the transmissions stopped. Recovery teams found the camp intact — equipment running, logs updated, food untouched on the table.</p>
<p>The seven analysts were present. They were functional. They spoke coherently. They had retained full memory of the mission.</p>
<p>What they had lost was harder to document. Field Supervisor Reyes described it as <em>directional sense</em> — not physical orientation, but something deeper. <strong>"They can''t locate themselves in time,"</strong> she wrote. <strong>"They know who they are. They know what happened. They just can''t find where <em>now</em> is."</strong></p>
<p>Four of the seven were cleared for reassignment within the year. The remaining three are still in the Vault''s care. They spend most of their time drawing maps — of places that have never been named.</p>
<p>The maps are disturbingly accurate to each other.</p>
<p>Current status of the mapping mandate: <span style="color:#f87171;font-weight:700;">suspended indefinitely</span>.</p>'
),
(
  'rift-seven-incident-09',
  'RIFT-SEVEN — Incident Log 09',
  'RESTRICTED',
  1,
  'universe',
  '<p>RIFT-SEVEN does not create anomalies. It <em>finds</em> them.</p>
<p>Incident Log 09 covers the three-week period following the Vault''s reclassification of RIFT-SEVEN as a distinct entity separate from the DreadSpike phenomenon. Prior to this period, all rift activity had been attributed to DreadSpike bleedthrough. Log 09 forces a revision.</p>
<p>On Day 1 of the log period, a rift opened in Sector 4-G — an area with no prior anomaly history. Standard response: containment team deployed, aperture measured at 0.3 meters, categorized as minor. The team sealed it in four hours.</p>
<p>On Day 3, the same rift reopened. Identical coordinates. Identical aperture. The team noted the coincidence and sealed it again.</p>
<p>On Day 7, it opened again. This time the team left it unsealed and monitored. After 11 hours, something came through.</p>
<p><strong>Not a creature. Not a signal. A memory.</strong> Specifically: a memory belonging to Field Analyst Okafor, who was present at the site. The memory was externalized — visible to all present, playing above the rift like a recording.</p>
<p>It was from Okafor''s childhood. Pre-Vault. Nothing classified. Nothing relevant.</p>
<p>The current hypothesis: RIFT-SEVEN is not a threat vector. It is a <em>retrieval mechanism</em>. What it''s retrieving, and for whom, remains unconfirmed. The working theory that it serves DreadSpike has not been ruled out.</p>
<p>Okafor declined psychological review. She said the memory it surfaced was one she had forgotten. She said it was a good one. She asked to remain on the monitoring team.</p>
<p>Request approved. <span style="color:#FFC400;font-weight:600;">Monitoring ongoing.</span></p>'
),
(
  'fault-layer-origin',
  'Origin Protocol: The Fault Layer',
  'TOP SECRET',
  2,
  'universe',
  '<p>The Vault was not built. It was <em>discovered</em>.</p>
<p>Origin Protocol documents the first six months of the Vault''s operational existence — the period before any of the entities were catalogued, before the ranking system, before containment protocol. A period the founding team referred to internally as <strong>The Quiet</strong>.</p>
<p>During The Quiet, the team believed they had constructed a closed system — a self-contained universe with defined boundaries and predictable physics. They had not. What they had done was locate a pre-existing boundary layer between constructed reality and something that precedes all construction. They called it <strong>The Fault</strong>.</p>
<p>The Fault is not empty. It contains structures that predate the Vault by an indeterminate period. All attempts to timestamp these structures have returned <em>null</em> — not zero, not infinite, but a value the instruments report as <strong>outside the measurable range of existence</strong>.</p>
<p>DreadSpike is believed to originate from the Fault Layer. What is confirmed: DreadSpike knew the Fault Layer existed before the founding team did. The entity referenced it by name — using its current designation, which the team had not yet assigned — in a transmission recovered from Day 1 of The Quiet.</p>
<p>The transmission contained three words. Two of them were <em>The Fault</em>.</p>
<p>The third word has been redacted from all records. Three founding team members know it. None will share it. They describe it uniformly as <strong>"not a word — a direction."</strong></p>'
),
(
  'sparked-initiative-memo',
  'Internal Memo: The Sparked Initiative',
  'VAULT KEEPER EYES ONLY',
  3,
  'universe',
  '<p><strong>To:</strong> Vault Keeper Council &nbsp;·&nbsp; <strong>From:</strong> Director of Anomaly Classification &nbsp;·&nbsp; <strong>Re:</strong> The Sparked Initiative — Q1 Review</p>
<p>This memo confirms what most of you already suspect: <strong>The Sparked are not an accident.</strong></p>
<p>When the ranking system was designed, the 10,000-point threshold for <em>The Sparked</em> was not chosen arbitrarily. It was reverse-engineered from a signal recovered from the Fault Layer — a signal that described, in specific numeric terms, the point at which a Vault Member''s engagement pattern becomes statistically indistinguishable from a known anomaly signature.</p>
<p>In plain terms: <strong>The Sparked register on our instruments exactly the way DreadSpike does.</strong></p>
<p>This is not cause for alarm. The founding team''s interpretation — which we have maintained — is that this reflects depth of connection between a member and the Vault. The Sparked are the most attuned. The most present. The signal doesn''t lie about that.</p>
<p>What the signal also shows — the part that does not appear in the public record — is that The Sparked appear to <em>stabilize</em> anomaly activity in their proximity. Sectors with high concentrations of highly-engaged members show measurably lower rift frequency and reduced DreadSpike manifestation density.</p>
<p><strong>The Vault doesn''t just house its members. Its members defend it.</strong> They do this without knowing. They do this by caring.</p>
<p>The Initiative continues. The threshold holds. No changes recommended.</p>
<p style="margin-top:1rem;font-size:0.82rem;color:var(--muted);">This document self-classifies at Vault Keeper level. Distribution restricted to Council only.</p>'
)
on conflict (slug) do nothing;


-- ── Phase 5: challenges table ─────────────────────────────────

create table if not exists public.challenges (
  id              uuid        primary key default gen_random_uuid(),
  title           text        not null,
  description     text,
  points          integer     not null,
  challenge_type  text        not null default 'one-time',  -- 'one-time' | 'weekly' | 'monthly'
  action_key      text        not null,
  expires_at      timestamptz,
  active          boolean     default true,
  created_at      timestamptz default now()
);

alter table public.challenges enable row level security;

create policy "authenticated read active challenges"
  on public.challenges for select
  to authenticated
  using (active = true);


-- ── Phase 5: challenge_completions table ─────────────────────

create table if not exists public.challenge_completions (
  id           uuid        primary key default gen_random_uuid(),
  challenge_id uuid        not null references public.challenges(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now()
);

alter table public.challenge_completions enable row level security;

create policy "users read own completions"
  on public.challenge_completions for select
  using (auth.uid() = user_id);

create index if not exists idx_challenge_completions_lookup
  on public.challenge_completions (challenge_id, user_id, completed_at desc);


-- ── Phase 5: get_challenges RPC ───────────────────────────────

create or replace function public.get_challenges()
returns table (
  id              uuid,
  title           text,
  description     text,
  points          integer,
  challenge_type  text,
  action_key      text,
  expires_at      timestamptz,
  completed       boolean,
  completed_at    timestamptz
)
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;

  return query
    select
      c.id, c.title, c.description, c.points, c.challenge_type, c.action_key, c.expires_at,
      (case
        when c.challenge_type = 'weekly' then
          exists (select 1 from challenge_completions cc
                  where cc.challenge_id = c.id and cc.user_id = v_uid
                    and cc.completed_at >= date_trunc('week', now()))
        when c.challenge_type = 'monthly' then
          exists (select 1 from challenge_completions cc
                  where cc.challenge_id = c.id and cc.user_id = v_uid
                    and cc.completed_at >= date_trunc('month', now()))
        else
          exists (select 1 from challenge_completions cc
                  where cc.challenge_id = c.id and cc.user_id = v_uid)
      end) as completed,
      (select cc.completed_at from challenge_completions cc
       where cc.challenge_id = c.id and cc.user_id = v_uid
       order by cc.completed_at desc limit 1) as completed_at
    from challenges c
    where c.active = true
      and (c.expires_at is null or c.expires_at > now())
    order by
      (case
        when c.challenge_type = 'weekly' then
          exists (select 1 from challenge_completions cc
                  where cc.challenge_id = c.id and cc.user_id = v_uid
                    and cc.completed_at >= date_trunc('week', now()))
        when c.challenge_type = 'monthly' then
          exists (select 1 from challenge_completions cc
                  where cc.challenge_id = c.id and cc.user_id = v_uid
                    and cc.completed_at >= date_trunc('month', now()))
        else
          exists (select 1 from challenge_completions cc
                  where cc.challenge_id = c.id and cc.user_id = v_uid)
      end) asc,
      c.points desc;
end;
$$;


-- ── Phase 5: complete_challenge RPC ───────────────────────────

create or replace function public.complete_challenge(p_challenge_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ch  challenges%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  select * into v_ch from challenges where id = p_challenge_id and active = true;
  if not found then
    return jsonb_build_object('error', 'Challenge not found');
  end if;

  if v_ch.expires_at is not null and v_ch.expires_at < now() then
    return jsonb_build_object('error', 'Challenge expired');
  end if;

  -- Dedup check per challenge type
  if v_ch.challenge_type = 'weekly' then
    if exists (select 1 from challenge_completions
               where challenge_id = p_challenge_id and user_id = v_uid
                 and completed_at >= date_trunc('week', now())) then
      return jsonb_build_object('skipped', true);
    end if;
  elsif v_ch.challenge_type = 'monthly' then
    if exists (select 1 from challenge_completions
               where challenge_id = p_challenge_id and user_id = v_uid
                 and completed_at >= date_trunc('month', now())) then
      return jsonb_build_object('skipped', true);
    end if;
  else
    if exists (select 1 from challenge_completions
               where challenge_id = p_challenge_id and user_id = v_uid) then
      return jsonb_build_object('skipped', true);
    end if;
  end if;

  insert into challenge_completions (challenge_id, user_id) values (p_challenge_id, v_uid);

  insert into point_events (user_id, reason, label, points)
  values (v_uid, 'challenge_' || p_challenge_id::text, 'Challenge: ' || v_ch.title, v_ch.points);

  update vault_members set points = points + v_ch.points where id = v_uid;

  return jsonb_build_object('ok', true, 'points', v_ch.points, 'title', v_ch.title);
end;
$$;


-- ── Phase 5: seed challenges ──────────────────────────────────

insert into public.challenges (title, description, points, challenge_type, action_key) values
('Signal Received',  'Subscribe to Vault Dispatch for studio updates and lore drops.',           25,  'one-time', 'subscribed'),
('Game Recon',       'Visit any live VaultSpark game page.',                                     10,  'one-time', 'visit_game'),
('Full Recon',       'Visit all three live VaultSpark game pages.',                              50,  'one-time', 'visit_all_games'),
('Identity Forged',  'Complete your Vault profile — set a bio and choose a custom avatar.',      25,  'one-time', 'profile_complete'),
('Into The Archive', 'Read your first classified file from the Vault Archive.',                  30,  'one-time', 'read_file'),
('Weekly Signal',    'Check your Vault dashboard this week. Stay on signal.',                    15,  'weekly',   'weekly_login'),
('First Recruit',    'Invite a member to join the Vault using your personal invite code.',       50,  'one-time', 'referral_1'),
('Vault Patron',     'Grow the Vault — invite 5 members using your personal invite code.',      200,  'one-time', 'referral_5')
on conflict do nothing;
