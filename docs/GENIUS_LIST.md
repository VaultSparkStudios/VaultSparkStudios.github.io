# Genius Hit List — Session 354

Generated: 2026-09-14
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **73/100**
- Health: **yellow**
- Current SIL: **984/1000**
- CI health: **check gh run list**
- Current focus: S354 proved Cloudflare Web Analytics works end to end (beacon, report and ingestion verified; the seven-day zero was real traffic; two wrong fixes reverted unshipped), disclosed it on /privacy/, and closed a release-proof strand exposed by modeling one generator.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Verify the first Vault Narrative run after the S353 fix publishes a d…
Final score: **98**
[S353][SIL][OBS/P2] Verify the first Vault Narrative run after the S353 fix publishes a dispatch. Expect [vault-narrative] wrote … (anchor:…) and --check-fresh green; if it rejects, the log now prints the rejected text.
Why it matters: Verify the first Vault Narrative run after the S353 fix publishes a di shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 2. [PRODUCT] Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
Final score: **93**
[S349][OBS/P2] Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewriting them. They are published as unresolvedLegacyChecks because a challenge and a real edge outage leave an identical footprint once the shape is gone, so they cannot now be told apart. Once the edge sampler has produced a full 31-day window, the retained history ages them out naturally and the public number becomes fully classifier-current. Do NOT re-score them to improve the figure.
Why it matters: Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewrit is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Close field-vitals freshness only with real evidence. Surface observe…
Final score: **90**
[NEXT][SIL][OBS/P1] Close field-vitals freshness only with real evidence. Surface observed-through/stale-days, obtain a genuinely fresh post-S262 RUM cohort, and bind cohort verdicts to a release SHA so a fresh generated clock can never imply fresh field evidence.
Why it matters: Close field-vitals freshness only with real evidence. Surface observed is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
Final score: **74**
[S344][DESK/P1] ESCALATION: The Desk's cadence lever is still the founder's pick -- but the S344 symptom sentence has EXPIRED. Re-probed S345: build-news-freshness --check --require-daily now reports daily - latest 2026-09-07 - age 0d, and 2 editions published on 2026-09-07. The S344 text ('nothing has published since 2026-09-04', 'degraded to periodic') was true when written and is false now; it is corrected here rather than carried, because a blocker sentence is a claim with an expiry. What is NOT resolved, and is not claimed to be: the queue-width constraint that caused the 3-day gap is UNMEASURED locally -- the radar cache is CI-only and absent from a local tree, so this session could not confirm whether the queue widened or the day was simply lucky. 2 editions against a 4-slot/day promise is a partial recovery, not a met promise. The founder's pick (widen radar yield, shorten novelty, or reduce slots) stands, and the cadence gate's reds remain HONEST (D-S344.5).
Why it matters: ESCALATION: The Desk's cadence lever is still the founder's pick -- bu is a 10-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [PRODUCT] Authorize or decline immutable warm-origin migration. D-S303 reserves…
Final score: **72**
Authorize or decline immutable warm-origin migration. D-S303 reserves the GitHub Pages rollback-origin architecture decision for the founder; the current warm origin still follows mutable main.
Why it matters: Authorize or decline immutable warm-origin migration. D-S303 reserves  is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
Final score: **69**
[S344][INFRA/P1] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is vaulted. CANON-038 makes self-hosted Postgres first choice and cloud-managed the justified exception; D-S344.2 records the justification. The shared cluster's admin DSN is ABSENT, which CANON-038 itself names as its remaining founder-aware step, so there is currently nothing to migrate to. When it exists: this is an escalation, not a task — it moves live member accounts and the sign-in path onto a single box, AGENTS.md requires escalation before changing auth flows, and the cost saving is ~zero because the Supabase free tier is already cost-neutral (CANON-029). The static site is deliberately excluded: a free global CDN is not beaten by one box.
Why it matters: Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is open, local, and unblocked — can ship this session.

#### 3. [REVENUE] Annual Stripe activation once keys exist
Final score: **68**
[OPS] Annual Stripe activation once keys exist — replace the annual placeholder path only after the real Stripe annual plan keys are created.
Why it matters: Annual Stripe activation once keys exist is on the direct checkout path; unblocking it can activate income without building new features.

#### 4. [PRODUCT] Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
Final score: **66**
[NEXT][SIL][ANALYTICA/P1] Main-domain Cloudflare Web Analytics activation receipt. Unchanged from S318.
Why it matters: Main-domain Cloudflare Web Analytics activation receipt. Unchanged fro is open, local, and unblocked — can ship this session.

#### 5. [INTELLIGENCE] Extend proof/depth beyond the three core pages
Final score: **66**
[GENIUS][CONVERSION] Extend proof/depth beyond the three core pages — carry the stronger trust language into join/invite or other high-intent public entry routes if the next session stays conversion-focused.
Why it matters: Extend proof/depth beyond the three core pages keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

### LATER

#### 1. [VERIFY] Member-newsletter deployment and explicit arming decision remain sepa…
Final score: **65**
[S345→S347][ENG/P0] Member-newsletter deployment and explicit arming decision remain separate. S347 hardened the existing operator (8/8 focused tests); no deploy, secret update or send occurred. Management/function inspection is agent-capable; prior-session sandbox refusals are historical, not fresh human-only proof. Preserve D-S341.4 and the separate arming/first-send decision; verify the exact unauthenticated 401 guard before any approved send.
Why it matters: Member-newsletter deployment and explicit arming decision remain separ is a 354-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
Final score: **59**
[SIL][OBS/P1] Confirm the Desk surfaces cross their floors on real traffic. S319 observed that data/news-desk-engagement-history.ndjson has never existed, so the engagement path has never produced data end to end and every row correctly reads unavailable. Verify the first scheduled rum-pull run that writes a history row. Do not lower a floor to make the page look alive.
Why it matters: Confirm the Desk surfaces cross their floors on real traffic. S319 obs is a 354-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

#### 3. [PRODUCT] CF Worker automation unblock
Final score: **57**
[OPS] CF Worker automation unblock — add CF_WORKER_API_TOKEN so Worker deploys stop depending on local Wrangler auth.
Why it matters: CF Worker automation unblock is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [PRODUCT] Founder-owned items deferred. Passkey sign-in, signup walkthrough, pu…
Final score: **96**
[S354][FOUNDER DIRECTIVE] Founder-owned items deferred. Passkey sign-in, signup walkthrough, public member data, newsletter arming, Desk cadence, warm-origin, Workers Paid and the small confirmations wait until the founder picks them up; agent-owned items continue.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [VERIFY] Model the proof-surface generators, highest-risk first
Final score: **95**
[S353][SIL:1][CI/P2] Model the proof-surface generators, highest-risk first — 19 left. S354 modeled build-release-dependencies (and its missing release-proof edge, which exposed a real weekly-maintenance strand, now closed). Start with build-release-dependencies (weekly-maintenance stages its output). Read each generator for REAL sources, add the node, --update to lower the baseline.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [PRODUCT] Ship the sampler RPC entrypoint on Ark acceptance. Ark 01K2EQ77M9F29A…
Final score: **90**
[S352][SIL][OBS/P1] Ship the sampler RPC entrypoint on Ark acceptance. Ark 01K2EQ77M9F29A0EC9619EA4BC asks studio-ops to reuse studio-ops-cron */30 via a service binding. The website half needs a node-side cloudflare:workers shim for the unit tests.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 4. [PRODUCT] Free a cron slot, or move the account to Workers Paid. S352: an agent…
Final score: **87**
[S351][OBS/P0 · FOUNDER DECISION] Free a cron slot, or move the account to Workers Paid. S352: an agent-side third option went to studio-ops via Ark (row above); this row closes if studio-ops accepts. This is the single thing standing between the studio and ever observing its own edge, and it is now a one-sentence decision rather than an investigation. Five of five free-plan cron triggers are in use by other projects. Retiring one is a live change to that project (founder call); Workers Paid raises the cap to 1,000 and is a billing action reserved to a human under CANON-019. Everything downstream is already built, deployed and verified — namespace, binding, handler, drain, 12/12 drain self-tests.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [PRODUCT] Scoped website credential owner reconciliation. Fresh S347 preflight …
Final score: **78**
[S344→S347][SEC/P0] Scoped website credential owner reconciliation. Fresh S347 preflight still reports credential-project mismatch while management/SQL/function inspection is available. Ark 01K22H17HM5F6D2952E9B84165 requests the studio-ops owner fix without exposing credentials. Owner-pending, not a claim that credentials are absent or that only the founder can act; provider truth reads remain unproven.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [PRODUCT] The Phase 0 gate is a HUMAN walkthrough and has not been run. The pla…
Final score: **75**
[S343][QA/P0] The Phase 0 gate is a HUMAN walkthrough and has not been run. The plan's own gate is a real signup in a clean browser profile with the subscribe box left checked, landing on the dashboard. The fix is verified by build:check 388/388, mobile 215/215, worker 57/57, and by reading the SERVED bundle — but not by a person actually creating an account. ~3 minutes; do it before any onboarding push.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 7. [VERIFY] The [skip ci] publishers still do not cascade their derived artifacts…
Final score: **69**
[S351][CI/P1] The [skip ci] publishers still do not cascade their derived artifacts. b67c283d1 feat(desk): publish the latenight edition [skip ci] added news pages plus art and changed index.html at 22:20Z, then skipped CI — leaving the sitemap stale, five images missing from data/lqip-map.json, the mobile receipt bound to a superseded index.html, and the startup brief disagreeing with the shared revenue resolver. S351 ran that cascade BY HAND (lqip-map, sitemap, news-freshness, home-desk-module, oracle feed sanitizer, oracle answers, candidate manifest, plus a 215-cell mobile re-capture) and the repo was green afterwards. The debt is structural, not one bad commit: any publisher that takes [skip ci] must either run its own cascade or hand the work to a follow-up workflow. Until it does, every session that follows a publisher pays this tax. S352: the sitemap strand is closed structurally (graph node sitemap <- news/, 4 publishers fixed); the general class stays open, see the [SIL] row.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 8. [PRODUCT] Enable the edge uptime sampler
Final score: **69**
[S349→S351][OBS/P1] Enable the edge uptime sampler — BLOCKED ON A CRON SLOT, and now precisely. S351 cleared the S350 hold (the KV namespace created on the first attempt: production-UPTIME_SAMPLES = adfe5ed60c90426ea1286321360138e3) and deployed the Worker with the binding LIVE in production. The cron was then REFUSED: Cloudflare error 10072 — Workers Free caps the account at 5 cron triggers and all five belong to other projects (seamline */5, studio-ops-cron */30, veilos hourly, velaxis-proxy ×2). No cron = no invoker = scheduled() never runs, so the flag is back to "0" and the cron is commented out; left declared it fails EVERY future Worker deploy at the trigger step, because wrangler does not roll back the successful part. Remaining work is two lines once a founder picks (a) free a slot by retiring one of the five — a live change to a different project, not this repo's call — or (b) Workers Paid, which is billing and founder-reserved under CANON-019.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Verify the first Vault Narrative run after the S353 fix publishes a d…
2. Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
3. Close field-vitals freshness only with real evidence. Surface observe…
4. ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
5. Authorize or decline immutable warm-origin migration. D-S303 reserves…
6. Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
7. Annual Stripe activation once keys exist
8. Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
9. Extend proof/depth beyond the three core pages
10. Member-newsletter deployment and explicit arming decision remain sepa…
11. Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
12. CF Worker automation unblock

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
