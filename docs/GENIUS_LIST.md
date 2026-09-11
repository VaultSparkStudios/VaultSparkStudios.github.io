# Genius Hit List — Session 350

Generated: 2026-09-11
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **77/100**
- Health: **yellow**
- Current SIL: **983/1000**
- CI health: **check gh run list**
- Current focus: S350 recovered the un-written-back S349 follow-up, stopped hidden tabs polling presence and rotating the Vault Pulse ticker, root-fixed a shell cleanup regex that had never matched (pruning eight stale shells), and fixed heading-order skips on three public pages.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
Final score: **96**
[S349][OBS/P2] Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewriting them. They are published as unresolvedLegacyChecks because a challenge and a real edge outage leave an identical footprint once the shape is gone, so they cannot now be told apart. Once the edge sampler has produced a full 31-day window, the retained history ages them out naturally and the public number becomes fully classifier-current. Do NOT re-score them to improve the figure.
Why it matters: Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewrit is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [COHESION] Uptime sampler: code SHIPPED DARK, enabling release still owed. S349 …
Final score: **95**
[S349][COST/P1] Uptime sampler: code SHIPPED DARK, enabling release still owed. S349 added scheduled() to the production worker behind UPTIME_SAMPLER_ENABLED (committed default "0", so the deploy is provably inert -- 5 unit tests assert no KV write and no subrequest while off), a bounded one-key-per-window KV schema with a 7-day TTL, and scripts/drain-uptime-kv.mjs (12/12 self-tests) that folds samples into the UNCHANGED uptime contract without ever rewriting a row. Not yet done, and deliberately not claimed: the KV namespace does not exist, the cron trigger is commented out, and the flag is off -- so no sample has ever been written and the Actions cron is still the only producer. The exact four-step enabling sequence is in cloudflare/wrangler.toml. Do it as its own release with its own rollback evidence, per the original task text.
Why it matters: Uptime sampler: code SHIPPED DARK, enabling release still owed. S349 a is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 4. [PRODUCT] Self-test the shell cleanup pattern against a synthetic stale name so…
Final score: **93**
[S350][SIL][OPS/P3] Self-test the shell cleanup pattern against a synthetic stale name so it cannot go dead silently again.
Why it matters: Self-test the shell cleanup pattern against a synthetic stale name so  is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Close field-vitals freshness only with real evidence. Surface observe…
Final score: **87**
[NEXT][SIL][OBS/P1] Close field-vitals freshness only with real evidence. Surface observed-through/stale-days, obtain a genuinely fresh post-S262 RUM cohort, and bind cohort verdicts to a release SHA so a fresh generated clock can never imply fresh field evidence.
Why it matters: Close field-vitals freshness only with real evidence. Surface observed is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
Final score: **71**
[S344][DESK/P1] ESCALATION: The Desk's cadence lever is still the founder's pick -- but the S344 symptom sentence has EXPIRED. Re-probed S345: build-news-freshness --check --require-daily now reports daily - latest 2026-09-07 - age 0d, and 2 editions published on 2026-09-07. The S344 text ('nothing has published since 2026-09-04', 'degraded to periodic') was true when written and is false now; it is corrected here rather than carried, because a blocker sentence is a claim with an expiry. What is NOT resolved, and is not claimed to be: the queue-width constraint that caused the 3-day gap is UNMEASURED locally -- the radar cache is CI-only and absent from a local tree, so this session could not confirm whether the queue widened or the day was simply lucky. 2 editions against a 4-slot/day promise is a partial recovery, not a met promise. The founder's pick (widen radar yield, shorten novelty, or reduce slots) stands, and the cadence gate's reds remain HONEST (D-S344.5).
Why it matters: ESCALATION: The Desk's cadence lever is still the founder's pick -- bu is a 6-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [PRODUCT] Authorize or decline immutable warm-origin migration. D-S303 reserves…
Final score: **69**
Authorize or decline immutable warm-origin migration. D-S303 reserves the GitHub Pages rollback-origin architecture decision for the founder; the current warm origin still follows mutable main.
Why it matters: Authorize or decline immutable warm-origin migration. D-S303 reserves  is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
Final score: **66**
[S344][INFRA/P1] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is vaulted. CANON-038 makes self-hosted Postgres first choice and cloud-managed the justified exception; D-S344.2 records the justification. The shared cluster's admin DSN is ABSENT, which CANON-038 itself names as its remaining founder-aware step, so there is currently nothing to migrate to. When it exists: this is an escalation, not a task — it moves live member accounts and the sign-in path onto a single box, AGENTS.md requires escalation before changing auth flows, and the cost saving is ~zero because the Supabase free tier is already cost-neutral (CANON-029). The static site is deliberately excluded: a free global CDN is not beaten by one box.
Why it matters: Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is open, local, and unblocked — can ship this session.

#### 5. [REVENUE] Annual Stripe activation once keys exist
Final score: **65**
[OPS] Annual Stripe activation once keys exist — replace the annual placeholder path only after the real Stripe annual plan keys are created.
Why it matters: Annual Stripe activation once keys exist is on the direct checkout path; unblocking it can activate income without building new features.

### LATER

#### 1. [PRODUCT] Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
Final score: **63**
[NEXT][SIL][ANALYTICA/P1] Main-domain Cloudflare Web Analytics activation receipt. Unchanged from S318.
Why it matters: Main-domain Cloudflare Web Analytics activation receipt. Unchanged fro is open, local, and unblocked — can ship this session.

#### 2. [INTELLIGENCE] Extend proof/depth beyond the three core pages
Final score: **63**
[GENIUS][CONVERSION] Extend proof/depth beyond the three core pages — carry the stronger trust language into join/invite or other high-intent public entry routes if the next session stays conversion-focused.
Why it matters: Extend proof/depth beyond the three core pages keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 3. [VERIFY] Member-newsletter deployment and explicit arming decision remain sepa…
Final score: **62**
[S345→S347][ENG/P0] Member-newsletter deployment and explicit arming decision remain separate. S347 hardened the existing operator (8/8 focused tests); no deploy, secret update or send occurred. Management/function inspection is agent-capable; prior-session sandbox refusals are historical, not fresh human-only proof. Preserve D-S341.4 and the separate arming/first-send decision; verify the exact unauthenticated 401 guard before any approved send.
Why it matters: Member-newsletter deployment and explicit arming decision remain separ is a 350-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### DEFERRED / GATED

#### 1. [PRODUCT] Scoped website credential owner reconciliation. Fresh S347 preflight …
Final score: **93**
[S344→S347][SEC/P0] Scoped website credential owner reconciliation. Fresh S347 preflight still reports credential-project mismatch while management/SQL/function inspection is available. Ark 01K22H17HM5F6D2952E9B84165 requests the studio-ops owner fix without exposing credentials. Owner-pending, not a claim that credentials are absent or that only the founder can act; provider truth reads remain unproven.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 2. [SECURITY] Enable the edge uptime sampler -- its own release, per the original t…
Final score: **90**
[S349][OBS/P1] Enable the edge uptime sampler -- its own release, per the original task text. Create the KV namespace, uncomment the binding + [triggers] cron in cloudflare/wrangler.toml, flip UPTIME_SAMPLER_ENABLED to "1", deploy, then node scripts/drain-uptime-kv.mjs --dry-run to confirm samples land before draining for real. Rollback is a flag flip. Until this runs, edge liveness is honestly reported as edge-unobservable and is genuinely unmeasured -- the honest state is not the fixed state. S350: held on permission -- the gateway deploy token lacks KV scope (error 10000); the Cloudflare MCP can create the namespace but the agent permission layer blocked it as a shared-resource change. Needs a founder allow, then steps 2-4.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [PRODUCT] The Phase 0 gate is a HUMAN walkthrough and has not been run. The pla…
Final score: **90**
[S343][QA/P0] The Phase 0 gate is a HUMAN walkthrough and has not been run. The plan's own gate is a real signup in a clean browser profile with the subscribe box left checked, landing on the dashboard. The fix is verified by build:check 388/388, mobile 215/215, worker 57/57, and by reading the SERVED bundle — but not by a person actually creating an account. ~3 minutes; do it before any onboarding push.
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

1. Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
2. Post-push CI confirmation
3. Uptime sampler: code SHIPPED DARK, enabling release still owed. S349 …
4. Self-test the shell cleanup pattern against a synthetic stale name so…
5. Close field-vitals freshness only with real evidence. Surface observe…
6. ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
7. Authorize or decline immutable warm-origin migration. D-S303 reserves…
8. Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
9. Annual Stripe activation once keys exist
10. Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
11. Extend proof/depth beyond the three core pages
12. Member-newsletter deployment and explicit arming decision remain sepa…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
