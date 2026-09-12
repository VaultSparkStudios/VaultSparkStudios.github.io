# Genius Hit List — Session 351

Generated: 2026-09-12
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **77/100**
- Health: **yellow**
- Current SIL: **987/1000**
- CI health: **check gh run list**
- Current focus: S351 enabled the edge uptime sampler by re-probing a two-session-old blocker that had already lapsed (KV namespace created on the first attempt), root-fixed two producers that could only ever report success while doing nothing, and wired 16 unit tests that no runner had ever executed into the build gate.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Read back the first edge sample
Final score: **96**
[S351][OBS/P0] Read back the first edge sample — the sampler is enabled, not yet observed. scheduled() is armed on a 30-minute cron with a live KV binding, but nothing has been read back. Run node scripts/drain-uptime-kv.mjs --dry-run after the first window, confirm keys exist and parse, then drain for real. Until a sample is read back, /status/ must keep saying the edge is UNMEASURED. Enabling a producer is not the same as having a measurement, and the flag being "1" is not evidence.
Why it matters: Read back the first edge sample is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Add a divergence gate for the unit-suite lists. The deliverable is a …
Final score: **93**
[S351][QA/P2] Add a divergence gate for the unit-suite lists. The deliverable is a NEW check — nothing in the repo compares the declared unit-spec list against the list the build gate actually executes. S351 found those two lists out of sync (five declared, two executed) and the three orphaned suites invoked by no runner at all; the lists were reconciled by hand, which fixes today and prevents nothing. Write a check that fails when the two sets differ and wire it into build:check:steps, so the next spec file cannot be added to one list and silently omitted from the other.
Why it matters: Add a divergence gate for the unit-suite lists. The deliverable is a N is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
Final score: **90**
[S349][OBS/P2] Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewriting them. They are published as unresolvedLegacyChecks because a challenge and a real edge outage leave an identical footprint once the shape is gone, so they cannot now be told apart. Once the edge sampler has produced a full 31-day window, the retained history ages them out naturally and the public number becomes fully classifier-current. Do NOT re-score them to improve the figure.
Why it matters: Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewrit is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Close field-vitals freshness only with real evidence. Surface observe…
Final score: **87**
[NEXT][SIL][OBS/P1] Close field-vitals freshness only with real evidence. Surface observed-through/stale-days, obtain a genuinely fresh post-S262 RUM cohort, and bind cohort verdicts to a release SHA so a fresh generated clock can never imply fresh field evidence.
Why it matters: Close field-vitals freshness only with real evidence. Surface observed is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
Final score: **71**
[S344][DESK/P1] ESCALATION: The Desk's cadence lever is still the founder's pick -- but the S344 symptom sentence has EXPIRED. Re-probed S345: build-news-freshness --check --require-daily now reports daily - latest 2026-09-07 - age 0d, and 2 editions published on 2026-09-07. The S344 text ('nothing has published since 2026-09-04', 'degraded to periodic') was true when written and is false now; it is corrected here rather than carried, because a blocker sentence is a claim with an expiry. What is NOT resolved, and is not claimed to be: the queue-width constraint that caused the 3-day gap is UNMEASURED locally -- the radar cache is CI-only and absent from a local tree, so this session could not confirm whether the queue widened or the day was simply lucky. 2 editions against a 4-slot/day promise is a partial recovery, not a met promise. The founder's pick (widen radar yield, shorten novelty, or reduce slots) stands, and the cadence gate's reds remain HONEST (D-S344.5).
Why it matters: ESCALATION: The Desk's cadence lever is still the founder's pick -- bu is a 7-session-old carry-forward; verify or close it so it stops polluting the hit list.

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
Why it matters: Member-newsletter deployment and explicit arming decision remain separ is a 351-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### DEFERRED / GATED

#### 1. [PRODUCT] Scoped website credential owner reconciliation. Fresh S347 preflight …
Final score: **93**
[S344→S347][SEC/P0] Scoped website credential owner reconciliation. Fresh S347 preflight still reports credential-project mismatch while management/SQL/function inspection is available. Ark 01K22H17HM5F6D2952E9B84165 requests the studio-ops owner fix without exposing credentials. Owner-pending, not a claim that credentials are absent or that only the founder can act; provider truth reads remain unproven.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 2. [PRODUCT] The Phase 0 gate is a HUMAN walkthrough and has not been run. The pla…
Final score: **90**
[S343][QA/P0] The Phase 0 gate is a HUMAN walkthrough and has not been run. The plan's own gate is a real signup in a clean browser profile with the subscribe box left checked, landing on the dashboard. The fix is verified by build:check 388/388, mobile 215/215, worker 57/57, and by reading the SERVED bundle — but not by a person actually creating an account. ~3 minutes; do it before any onboarding push.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [VERIFY] The [skip ci] publishers still do not cascade their derived artifacts…
Final score: **88**
[S351][CI/P1] The [skip ci] publishers still do not cascade their derived artifacts. b67c283d1 feat(desk): publish the latenight edition [skip ci] added news pages plus art and changed index.html at 22:20Z, then skipped CI — leaving the sitemap stale, five images missing from data/lqip-map.json, the mobile receipt bound to a superseded index.html, and the startup brief disagreeing with the shared revenue resolver. S351 ran that cascade BY HAND (lqip-map, sitemap, news-freshness, home-desk-module, oracle feed sanitizer, oracle answers, candidate manifest, plus a 215-cell mobile re-capture) and the repo was green afterwards. The debt is structural, not one bad commit: any publisher that takes [skip ci] must either run its own cascade or hand the work to a follow-up workflow. Until it does, every session that follows a publisher pays this tax.
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

1. Read back the first edge sample
2. Post-push CI confirmation
3. Add a divergence gate for the unit-suite lists. The deliverable is a …
4. Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
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
