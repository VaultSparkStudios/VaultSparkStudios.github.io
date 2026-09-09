# Genius Hit List — Session 347

Generated: 2026-09-09
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **73/100**
- Health: **yellow**
- Current SIL: **986/1000**
- CI health: **check gh run list**
- Current focus: S347 recovered candidate is locally verified: 23 audit items, 477 build checks, and 168 rendered route/state captures. Commit and complete staging-first release.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 2. [PRODUCT] Make local performance sampling repeatable. Isolate host load, record…
Final score: **93**
[S348][PERF/P2] Make local performance sampling repeatable. Isolate host load, record multiple runs, and report a distribution instead of one score. Keep simulated and observed largest-contentful-paint distinct and never promote a local lab result to field Core Web Vitals.
Why it matters: Make local performance sampling repeatable. Isolate host load, record  is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Evidence-graph coverage debt remains explicit. Five source-verified n…
Final score: **90**
[S345→S347][BUILD/P3] Evidence-graph coverage debt remains explicit. Five source-verified nodes were implemented and focused-tested in S347. Current ratchet: 33 unmodeled of 67 --check-gated generators. Check presence does not imply byte-drift comparison. Future modeling requires actual dependency evidence; no blanket graph-complete claim.
Why it matters: Evidence-graph coverage debt remains explicit. Five source-verified no is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
Final score: **81**
[S344][DESK/P1] ESCALATION: The Desk's cadence lever is still the founder's pick -- but the S344 symptom sentence has EXPIRED. Re-probed S345: build-news-freshness --check --require-daily now reports daily - latest 2026-09-07 - age 0d, and 2 editions published on 2026-09-07. The S344 text ('nothing has published since 2026-09-04', 'degraded to periodic') was true when written and is false now; it is corrected here rather than carried, because a blocker sentence is a claim with an expiry. What is NOT resolved, and is not claimed to be: the queue-width constraint that caused the 3-day gap is UNMEASURED locally -- the radar cache is CI-only and absent from a local tree, so this session could not confirm whether the queue widened or the day was simply lucky. 2 editions against a 4-slot/day promise is a partial recovery, not a met promise. The founder's pick (widen radar yield, shorten novelty, or reduce slots) stands, and the cadence gate's reds remain HONEST (D-S344.5).
Why it matters: ESCALATION: The Desk's cadence lever is still the founder's pick -- bu was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [PRODUCT] <!-- evidence-open: the files named are the churning OUTPUTS and the …
Final score: **78**
<!-- evidence-open: the files named are the churning OUTPUTS and the suspect generators, not deliverables; the deliverable is a pinned-clock bisect and fix --> [S335][BUILD/P2] Two identical builds minutes apart still churn 47 files — commit-derived feeds are the source, not timestamps. With no commit between them, build 2 rewrote feed/forge-ledger.{json,xml} (206 lines), api/feedback-provenance.json (a whole theme dropped), api/ship-receipts.json, api/status-proof.json, api/news-visual-receipts.json and the changelog SSR block; a third build would churn again. All derive from api/commit-map.json / the git log through build-parallel-phase.mjs (which runs build-feedback-provenance + build-ship-receipts), so the working theory is a clock-relative selection window in that chain. Bisect: run build-forge-feed.mjs twice with a pinned --now (add the flag if absent) and diff; then the provenance pair. This is the receipt-cascade cost the S334 "vs-yas" item was really measuring. Fixed this session: _headers lagged one build because early-hints ran before the postbuild shell rotation — moved into postbuild after build-shell-assets.
Why it matters: <!-- evidence-open: the files named are the churning OUTPUTS and the s is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
Final score: **69**
[S344][INFRA/P1] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is vaulted. CANON-038 makes self-hosted Postgres first choice and cloud-managed the justified exception; D-S344.2 records the justification. The shared cluster's admin DSN is ABSENT, which CANON-038 itself names as its remaining founder-aware step, so there is currently nothing to migrate to. When it exists: this is an escalation, not a task — it moves live member accounts and the sign-in path onto a single box, AGENTS.md requires escalation before changing auth flows, and the cost saving is ~zero because the Supabase free tier is already cost-neutral (CANON-029). The static site is deliberately excluded: a free global CDN is not beaten by one box.
Why it matters: Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is open, local, and unblocked — can ship this session.

#### 3. [SECURITY] Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs s…
Final score: **66**
[S335][TOKEN/P2] Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs shards the handoff. It is the largest file any session can touch (~126K tokens raw). compact-handoff.mjs and rotate-ledger.mjs read the handoff archive, so the shard has to be introduced through those readers, not by moving files. Measure with context-meter.mjs before and after.
Why it matters: Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs sh lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 4. [VERIFY] Member-newsletter deployment and explicit arming decision remain sepa…
Final score: **65**
[S345→S347][ENG/P0] Member-newsletter deployment and explicit arming decision remain separate. S347 hardened the existing operator (8/8 focused tests); no deploy, secret update or send occurred. Management/function inspection is agent-capable; prior-session sandbox refusals are historical, not fresh human-only proof. Preserve D-S341.4 and the separate arming/first-send decision; verify the exact unauthenticated 401 guard before any approved send.
Why it matters: Member-newsletter deployment and explicit arming decision remain separ is a 347-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [VERIFY] <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
Final score: **65**
<!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are named as context; the deliverable is the Worker scheduled handler + KV drain, which do not exist yet --> [S335][COST/P2] Move the 30-minute uptime probe off GitHub Actions. uptime-probe.yml is 48 runs and 48 [skip ci] commits a day (71% of all scheduled runs) and is the churn that buried the forge ledger in S333. Design: a Worker scheduled() handler probes the same route list and writes samples to KV under uptime:<ts>; the Actions job runs once daily, drains KV into api/uptime.json + geo-vitals + staging parity, and commits once. probe-uptime.mjs must learn to consume KV samples instead of producing them; check-uptime-contract.mjs defines the sample cadence the public SLA promises — keep it. Not done in S335 because it rewrites a public trust surface's data path; the same-cron pair (linkcheck + member-seo) was merged into weekly-maintenance.yml instead.
Why it matters: <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are na is a 12-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [SECURITY] Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-0…
Final score: **63**
[S333][NEWS/P1] Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-08-31 edition proves the pipeline works, but it was manually dispatched under observation. The cron itself has not gone green unattended since 2026-08-29. Check the 06:07 / 12:07 / 18:07 / 22:07 UTC slots; if they still drop while a dispatch succeeds, the difference is environmental (scheduler context, token scope, or queue freshness), not the selection or model logic this session fixed.
Why it matters: Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-08 lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 2. [PRODUCT] The Desk's binding constraint is now topic ACCEPTANCE, and it current…
Final score: **60**
[S333][NEWS/P0] The Desk's binding constraint is now topic ACCEPTANCE, and it currently queues nothing. Measured across four runs on 2026-08-31: 03:19 queued 3, 04:10 queued 2 (one became the published edition), the 06:44 scheduled run queued 0 of 177, and a local news-trend-radar.mjs --scan reproduces 0 queued / 176 rejected deterministically. Selection and the authoring model are both fixed and proven; the pipeline now starves upstream instead. Prediction to check first: today's edition ages to 1 day old on 2026-09-01, at which point build-news-freshness --check --require-daily fails again and the Desk returns to red — not from the defects fixed in S333, but from an empty queue. Investigate the rejection thresholds (corroboration count, recency window, published-slug dedupe from S329, vendor filter) and establish what acceptance rate a 4-slot daily cadence actually requires.
Why it matters: The Desk's binding constraint is now topic ACCEPTANCE, and it currentl is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Fact extraction accepts advertising copy as a sourced fact. The 2026-…
Final score: **55**
[S334][NEWS/P2] Fact extraction accepts advertising copy as a sourced fact. The 2026-08-31 edition's first fact reads "Scott Gilbertson Top Shark Promo Codes for August 2026 Shark makes some seriously powerful vacuums..." sourced to the Wired article. factCandidates() scores for digits, proper nouns and reporting verbs and penalises marketing pronouns, but a syndicated promo block passes every filter. This is a public-surface truth issue, not a cosmetic one: it is rendered as a cited fact under a real publisher URL. Consider penalising sentences whose entities do not appear in the headline or topic title.
Why it matters: Fact extraction accepts advertising copy as a sourced fact. The 2026-0 is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [PRODUCT] Scoped website credential owner reconciliation. Fresh S347 preflight …
Final score: **96**
[S344→S347][SEC/P0] Scoped website credential owner reconciliation. Fresh S347 preflight still reports credential-project mismatch while management/SQL/function inspection is available. Ark 01K22H17HM5F6D2952E9B84165 requests the studio-ops owner fix without exposing credentials. Owner-pending, not a claim that credentials are absent or that only the founder can act; provider truth reads remain unproven.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 2. [PRODUCT] The Phase 0 gate is a HUMAN walkthrough and has not been run. The pla…
Final score: **90**
[S343][QA/P0] The Phase 0 gate is a HUMAN walkthrough and has not been run. The plan's own gate is a real signup in a clean browser profile with the subscribe box left checked, landing on the dashboard. The fix is verified by build:check 388/388, mobile 215/215, worker 57/57, and by reading the SERVED bundle — but not by a person actually creating an account. ~3 minutes; do it before any onboarding push.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [PRODUCT] check-secrets reports READY for a credential it knows is failing. --f…
Final score: **81**
[S344][OBS/P1] check-secrets reports READY for a credential it knows is failing. --for supabase.admin prints ✓ READY 2/2 all present while the same CAPABILITY_MAP.json entry records lastProbeStatus: "auth-error" (2026-09-03). The gateway holds the disproof and does not consult it, on the surface an agent checks before declaring itself blocked (CANON-019). Shipped in the same Ark cargo; tracked here because this repo is the one being misled.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [BRAND] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. …
Final score: **81**
[S337][SEC/P1] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. ambient-core.bundle.js installs the TT default policy that the site's ~167 legacy innerHTML sinks depend on, and its own comment says it "MUST load before any sink usage" — but ambient-core is not the first script on the page. Measured across 137 built pages in S337: 31 sink-bearing client assets load before it, led by pwa-nav.js (81 pages) and pwa-install.js (72). Report-Only hides this; enforcement throws. This is the concrete blocker the board has been recording as "stale soak evidence" — both are true, only this one names a defect. The repair hoists the policy installer ahead of every sink-bearing asset, which rewrites the head of every page and invalidates every hash-bound receipt at once, so it needs its own session and its own reseal budget, not a rider on a deploy. Re-measure with the scan in D-S337.3 before and after. (D-S337.3)
Why it matters: Changes public vocabulary or navigation — requires founder sign-off before user-visible copy changes.

#### 5. [SECURITY] Decide whether to arm the Monthly Member Newsletter
Final score: **78**
[S341][OPS/P1] Decide whether to arm the Monthly Member Newsletter — it has never once sent. Every scheduled run since 2026-04-02 has failed; zero successes on record. Two confirmed causes: NEWSLETTER_SECRET does not exist as a repository secret, so the workflow sends Authorization: Bearer with an empty token; and POST {SUPABASE_FUNCTION_BASE_URL}/send-member-newsletter returns 404 NOT_FOUND because supabase/functions/send-member-newsletter/ exists here but was never deployed. Not founder-blocked: supabase.management is READY, so both the deploy and the secret are agent paths (CANON-019, phantom-blocker test satisfied). Deliberately not armed because doing so emails every member on the 2nd of next month, which is not a side effect of a website deploy session (D-S341.4). If armed: deploy the function, mint the secret, dispatch ONE manual run before the cron fires.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [VERIFY] Complete the Obelisk provider journey
Final score: **77**
[S342][AUTH/P0] Complete the Obelisk provider journey — it is the LAST step, and the command is --watch. node scripts/verify-provider-journey.mjs --watch, then in YOUR OWN browser (native Windows Hello works): sign in at /login → land on /vault-member/ → SIGN OUT there (the logout leg is the revocation evidence). 12-hour window, live callback:✓ compat:✓ logout:✓. Self-check: /api/auth/me returning identity: {...} means the callback landed. Do NOT use --live unless the passkey is in Windows Hello — it opens a fresh automated profile that cannot reach a Chrome-held credential (two 10-min runs expired writing nothing). Everything upstream is verified live: registration active with both callbacks, authorize with correct PKCE, revocation endpoint live, recordJourney wired at all three Worker legs. Clears real-provider-e2e-pending and unholds auth/, surface:identity, worker:identity.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 7. [INTELLIGENCE] Four public tables still render a silent zero
Final score: **75**
[S336][SEC/P1 · FOUNDER DECISION] Four public tables still render a silent zero — decide which member activity becomes publicly readable, then ship one migration. S336 completed the audit; the remaining step is a decision, not investigation. Verified against the migrations and probed live: challenge_submissions (no anon SELECT policy — only read_own + admin; read anonymously by /community/ and all seven /leaderboards/*; probe returns HTTP 200 count 0), game_sessions (no anon SELECT at all; /community/ and /), point_events (auth.uid() = user_id only — powers the referral leaderboard and the public profile's "Recent activity", which renders its empty state forever), member_achievements (auth.uid() = member_id only — public profile shows "No achievements unlocked yet." permanently; its policy also keys member_id while the client filters user_id). The vault_members(username,…) PostgREST embeds at leaderboards/index.html:822,868 resolve to null for anon, so fixing the four alone would render raw UUIDs. Proposed shape, generalizing S335's public_leaderboard: definer projection views (public_challenge_feed, public_game_activity, public_point_events, public_member_achievements), each honouring vault_members.public_profile, each with an explicit grant select … to anon, authenticated, then repoint the ~20 call sites. NOT applied in S336 because it decides what member activity is publicly visible — a privacy/product call reserved for the founder. Apply with scripts/apply-supabase-migration.mjs (pre-image + probe) once the columns are chosen. (D-S336.5)
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [PRODUCT] Confirm the founder-approved Season 1 defaults, then watch the first …
Final score: **69**
[S335][ENGAGE/P2] Confirm the founder-approved Season 1 defaults, then watch the first week. data/seasons.json declares "Season 1 — Ignition" (2026-09-02 → 2026-10-14, rewards in Vault Points only). Founder may veto name/dates/rewards at review. After a week: does season_xp move, does the weekly board fill, does the community #wall countdown render on mobile across all themes (CANON-053 receipt).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Post-push CI confirmation
2. Make local performance sampling repeatable. Isolate host load, record…
3. Evidence-graph coverage debt remains explicit. Five source-verified n…
4. ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
5. <!-- evidence-open: the files named are the churning OUTPUTS and the …
6. Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
7. Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs s…
8. Member-newsletter deployment and explicit arming decision remain sepa…
9. <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
10. Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-0…
11. The Desk's binding constraint is now topic ACCEPTANCE, and it current…
12. Fact extraction accepts advertising copy as a sourced fact. The 2026-…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
