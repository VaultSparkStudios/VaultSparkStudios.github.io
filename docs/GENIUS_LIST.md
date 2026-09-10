# Genius Hit List — Session 349

Generated: 2026-09-10
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **73/100**
- Health: **yellow**
- Current SIL: **991/1000**
- CI health: **check gh run list**
- Current focus: S349 stopped a public trust surface from lying: /status/ had reported edge-degraded on 604 consecutive samples since 2026-07-13 because Cloudflare began bot-challenging JSON and OPTIONS paths, and the probe read its own challenge as an outage. Unobservable is now a first-class state — neither an outage nor a pass.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Enable the edge uptime sampler -- its own release, per the original t…
Final score: **96**
[S349][OBS/P1] Enable the edge uptime sampler -- its own release, per the original task text. Create the KV namespace, uncomment the binding + [triggers] cron in cloudflare/wrangler.toml, flip UPTIME_SAMPLER_ENABLED to "1", deploy, then node scripts/drain-uptime-kv.mjs --dry-run to confirm samples land before draining for real. Rollback is a flag flip. Until this runs, edge liveness is honestly reported as edge-unobservable and is genuinely unmeasured -- the honest state is not the fixed state.
Why it matters: Enable the edge uptime sampler -- its own release, per the original ta is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
Final score: **93**
[S349][OBS/P2] Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewriting them. They are published as unresolvedLegacyChecks because a challenge and a real edge outage leave an identical footprint once the shape is gone, so they cannot now be told apart. Once the edge sampler has produced a full 31-day window, the retained history ages them out naturally and the public number becomes fully classifier-current. Do NOT re-score them to improve the figure.
Why it matters: Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewrit is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Uncancellable client timers keep polling in hidden tabs. Verified thi…
Final score: **90**
[S349][PERF/P2] Uncancellable client timers keep polling in hidden tabs. Verified this session: assets/desk-presence.js:114 (setInterval(refreshPresence, 30000) on every Desk article) and :49, plus assets/favicon-pulse.js:136 (90s) and assets/vault-pulse.js:202 (120s) contain no clearInterval and no document.hidden guard, so a backgrounded tab beacons the Worker indefinitely. assets/ambient-feature.bundle.js:217 already clears its timer and presence-badge.js:133 has the start/stop idiom to copy. vault-pulse.js:191 additionally runs an endless 6-10s DOM rotation off-screen -- gate it on the IntersectionObserver pattern S348 shipped for Changelog hydration.
Why it matters: Uncancellable client timers keep polling in hidden tabs. Verified this is open, local, and unblocked — can ship this session.

#### 4. [COHESION] Uptime sampler: code SHIPPED DARK, enabling release still owed. S349 …
Final score: **86**
[S349][COST/P1] Uptime sampler: code SHIPPED DARK, enabling release still owed. S349 added scheduled() to the production worker behind UPTIME_SAMPLER_ENABLED (committed default "0", so the deploy is provably inert -- 5 unit tests assert no KV write and no subrequest while off), a bounded one-key-per-window KV schema with a 7-day TTL, and scripts/drain-uptime-kv.mjs (12/12 self-tests) that folds samples into the UNCHANGED uptime contract without ever rewriting a row. Not yet done, and deliberately not claimed: the KV namespace does not exist, the cron trigger is commented out, and the flag is off -- so no sample has ever been written and the Actions cron is still the only producer. The exact four-step enabling sequence is in cloudflare/wrangler.toml. Do it as its own release with its own rollback evidence, per the original task text.
Why it matters: Uptime sampler: code SHIPPED DARK, enabling release still owed. S349 a is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

### NEXT

#### 1. [PRODUCT] Three public pages skip a heading level (h1 -> h3). community/index.h…
Final score: **84**
[S349][UX/P3] Three public pages skip a heading level (h1 -> h3). community/index.html, journal/index.html, contact/index.html. Demote the first <h3> on each to <h2>; assets/style.css already styles both and no anchor id is attached.
Why it matters: Three public pages skip a heading level (h1 -> h3). community/index.ht is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Close field-vitals freshness only with real evidence. Surface observe…
Final score: **78**
[NEXT][SIL][OBS/P1] Close field-vitals freshness only with real evidence. Surface observed-through/stale-days, obtain a genuinely fresh post-S262 RUM cohort, and bind cohort verdicts to a release SHA so a fresh generated clock can never imply fresh field evidence.
Why it matters: Close field-vitals freshness only with real evidence. Surface observed is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
Final score: **62**
[S344][DESK/P1] ESCALATION: The Desk's cadence lever is still the founder's pick -- but the S344 symptom sentence has EXPIRED. Re-probed S345: build-news-freshness --check --require-daily now reports daily - latest 2026-09-07 - age 0d, and 2 editions published on 2026-09-07. The S344 text ('nothing has published since 2026-09-04', 'degraded to periodic') was true when written and is false now; it is corrected here rather than carried, because a blocker sentence is a claim with an expiry. What is NOT resolved, and is not claimed to be: the queue-width constraint that caused the 3-day gap is UNMEASURED locally -- the radar cache is CI-only and absent from a local tree, so this session could not confirm whether the queue widened or the day was simply lucky. 2 editions against a 4-slot/day promise is a partial recovery, not a met promise. The founder's pick (widen radar yield, shorten novelty, or reduce slots) stands, and the cadence gate's reds remain HONEST (D-S344.5).
Why it matters: ESCALATION: The Desk's cadence lever is still the founder's pick -- bu is a 5-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] Authorize or decline immutable warm-origin migration. D-S303 reserves…
Final score: **60**
Authorize or decline immutable warm-origin migration. D-S303 reserves the GitHub Pages rollback-origin architecture decision for the founder; the current warm origin still follows mutable main.
Why it matters: Authorize or decline immutable warm-origin migration. D-S303 reserves  is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
Final score: **57**
[S344][INFRA/P1] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is vaulted. CANON-038 makes self-hosted Postgres first choice and cloud-managed the justified exception; D-S344.2 records the justification. The shared cluster's admin DSN is ABSENT, which CANON-038 itself names as its remaining founder-aware step, so there is currently nothing to migrate to. When it exists: this is an escalation, not a task — it moves live member accounts and the sign-in path onto a single box, AGENTS.md requires escalation before changing auth flows, and the cost saving is ~zero because the Supabase free tier is already cost-neutral (CANON-029). The static site is deliberately excluded: a free global CDN is not beaten by one box.
Why it matters: Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is open, local, and unblocked — can ship this session.

### LATER

#### 1. [REVENUE] Annual Stripe activation once keys exist
Final score: **56**
[OPS] Annual Stripe activation once keys exist — replace the annual placeholder path only after the real Stripe annual plan keys are created.
Why it matters: Annual Stripe activation once keys exist is on the direct checkout path; unblocking it can activate income without building new features.

#### 2. [VERIFY] Member-newsletter deployment and explicit arming decision remain sepa…
Final score: **55**
[S345→S347][ENG/P0] Member-newsletter deployment and explicit arming decision remain separate. S347 hardened the existing operator (8/8 focused tests); no deploy, secret update or send occurred. Management/function inspection is agent-capable; prior-session sandbox refusals are historical, not fresh human-only proof. Preserve D-S341.4 and the separate arming/first-send decision; verify the exact unauthenticated 401 guard before any approved send.
Why it matters: Member-newsletter deployment and explicit arming decision remain separ is a 349-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
Final score: **55**
[SIL][OBS/P1] Confirm the Desk surfaces cross their floors on real traffic. S319 observed that data/news-desk-engagement-history.ndjson has never existed, so the engagement path has never produced data end to end and every row correctly reads unavailable. Verify the first scheduled rum-pull run that writes a history row. Do not lower a floor to make the page look alive.
Why it matters: Confirm the Desk surfaces cross their floors on real traffic. S319 obs is a 349-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

### DEFERRED / GATED

#### 1. [PRODUCT] Scoped website credential owner reconciliation. Fresh S347 preflight …
Final score: **96**
[S344→S347][SEC/P0] Scoped website credential owner reconciliation. Fresh S347 preflight still reports credential-project mismatch while management/SQL/function inspection is available. Ark 01K22H17HM5F6D2952E9B84165 requests the studio-ops owner fix without exposing credentials. Owner-pending, not a claim that credentials are absent or that only the founder can act; provider truth reads remain unproven.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 2. [PRODUCT] The Phase 0 gate is a HUMAN walkthrough and has not been run. The pla…
Final score: **93**
[S343][QA/P0] The Phase 0 gate is a HUMAN walkthrough and has not been run. The plan's own gate is a real signup in a clean browser profile with the subscribe box left checked, landing on the dashboard. The fix is verified by build:check 388/388, mobile 215/215, worker 57/57, and by reading the SERVED bundle — but not by a person actually creating an account. ~3 minutes; do it before any onboarding push.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [BRAND] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. …
Final score: **84**
[S337][SEC/P1] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. ambient-core.bundle.js installs the TT default policy that the site's ~167 legacy innerHTML sinks depend on, and its own comment says it "MUST load before any sink usage" — but ambient-core is not the first script on the page. Measured across 137 built pages in S337: 31 sink-bearing client assets load before it, led by pwa-nav.js (81 pages) and pwa-install.js (72). Report-Only hides this; enforcement throws. This is the concrete blocker the board has been recording as "stale soak evidence" — both are true, only this one names a defect. The repair hoists the policy installer ahead of every sink-bearing asset, which rewrites the head of every page and invalidates every hash-bound receipt at once, so it needs its own session and its own reseal budget, not a rider on a deploy. Re-measure with the scan in D-S337.3 before and after. (D-S337.3)
Why it matters: Changes public vocabulary or navigation — requires founder sign-off before user-visible copy changes.

#### 4. [SECURITY] Decide whether to arm the Monthly Member Newsletter
Final score: **81**
[S341][OPS/P1] Decide whether to arm the Monthly Member Newsletter — it has never once sent. Every scheduled run since 2026-04-02 has failed; zero successes on record. Two confirmed causes: NEWSLETTER_SECRET does not exist as a repository secret, so the workflow sends Authorization: Bearer with an empty token; and POST {SUPABASE_FUNCTION_BASE_URL}/send-member-newsletter returns 404 NOT_FOUND because supabase/functions/send-member-newsletter/ exists here but was never deployed. Not founder-blocked: supabase.management is READY, so both the deploy and the secret are agent paths (CANON-019, phantom-blocker test satisfied). Deliberately not armed because doing so emails every member on the 2nd of next month, which is not a side effect of a website deploy session (D-S341.4). If armed: deploy the function, mint the secret, dispatch ONE manual run before the cron fires.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [VERIFY] Complete the Obelisk provider journey
Final score: **80**
[S342][AUTH/P0] Complete the Obelisk provider journey — it is the LAST step, and the command is --watch. node scripts/verify-provider-journey.mjs --watch, then in YOUR OWN browser (native Windows Hello works): sign in at /login → land on /vault-member/ → SIGN OUT there (the logout leg is the revocation evidence). 12-hour window, live callback:✓ compat:✓ logout:✓. Self-check: /api/auth/me returning identity: {...} means the callback landed. Do NOT use --live unless the passkey is in Windows Hello — it opens a fresh automated profile that cannot reach a Chrome-held credential (two 10-min runs expired writing nothing). Everything upstream is verified live: registration active with both callbacks, authorize with correct PKCE, revocation endpoint live, recordJourney wired at all three Worker legs. Clears real-provider-e2e-pending and unholds auth/, surface:identity, worker:identity.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [INTELLIGENCE] Four public tables still render a silent zero
Final score: **78**
[S336][SEC/P1 · FOUNDER DECISION] Four public tables still render a silent zero — decide which member activity becomes publicly readable, then ship one migration. S336 completed the audit; the remaining step is a decision, not investigation. Verified against the migrations and probed live: challenge_submissions (no anon SELECT policy — only read_own + admin; read anonymously by /community/ and all seven /leaderboards/*; probe returns HTTP 200 count 0), game_sessions (no anon SELECT at all; /community/ and /), point_events (auth.uid() = user_id only — powers the referral leaderboard and the public profile's "Recent activity", which renders its empty state forever), member_achievements (auth.uid() = member_id only — public profile shows "No achievements unlocked yet." permanently; its policy also keys member_id while the client filters user_id). The vault_members(username,…) PostgREST embeds at leaderboards/index.html:822,868 resolve to null for anon, so fixing the four alone would render raw UUIDs. Proposed shape, generalizing S335's public_leaderboard: definer projection views (public_challenge_feed, public_game_activity, public_point_events, public_member_achievements), each honouring vault_members.public_profile, each with an explicit grant select … to anon, authenticated, then repoint the ~20 call sites. NOT applied in S336 because it decides what member activity is publicly visible — a privacy/product call reserved for the founder. Apply with scripts/apply-supabase-migration.mjs (pre-image + probe) once the columns are chosen. (D-S336.5)
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [PRODUCT] Confirm the founder-approved Season 1 defaults, then watch the first …
Final score: **72**
[S335][ENGAGE/P2] Confirm the founder-approved Season 1 defaults, then watch the first week. data/seasons.json declares "Season 1 — Ignition" (2026-09-02 → 2026-10-14, rewards in Vault Points only). Founder may veto name/dates/rewards at review. After a week: does season_xp move, does the weekly board fill, does the community #wall countdown render on mobile across all themes (CANON-053 receipt).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [INTELLIGENCE] The mobile audit measures PRODUCTION by default, so it cannot see an …
Final score: **72**
[S334][MOBILE/P2] The mobile audit measures PRODUCTION by default, so it cannot see an undeployed change. playwright's baseURL defaults to https://vaultsparkstudios.com, and a local pass on a not-yet-deployed page is measuring the OLD live page. That is exactly how a P1 tap-target on the new pathway route reached CI: six local runs passed because they were probing the previous version. Set BASE_URL to a local preview when verifying an unshipped change, and add a route to the audit list only AFTER the deploy that ships it. Also run it at default concurrency — a --workers=4 pass raced on findings.jsonl and persisted 139 of 215 cells, which reads as missing matrix cells rather than lost writes.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. Enable the edge uptime sampler -- its own release, per the original t…
2. Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
3. Uncancellable client timers keep polling in hidden tabs. Verified thi…
4. Uptime sampler: code SHIPPED DARK, enabling release still owed. S349 …
5. Three public pages skip a heading level (h1 -> h3). community/index.h…
6. Close field-vitals freshness only with real evidence. Surface observe…
7. ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
8. Authorize or decline immutable warm-origin migration. D-S303 reserves…
9. Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
10. Annual Stripe activation once keys exist
11. Member-newsletter deployment and explicit arming decision remain sepa…
12. Confirm the Desk surfaces cross their floors on real traffic. S319 ob…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
