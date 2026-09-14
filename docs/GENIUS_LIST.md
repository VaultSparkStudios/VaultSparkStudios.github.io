# Genius Hit List — Session 352

Generated: 2026-09-14
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **77/100**
- Health: **yellow**
- Current SIL: **986/1000**
- CI health: **check gh run list**
- Current focus: S352 closed a publisher cascade the cascade gate could not see (sitemap.xml was staged by the Desk publisher and never rebuilt), stopped the write-back probe from reporting regeneration commits as skipped closeouts, and gated unit-suite list parity; the edge sampler is routed to studio-ops via Ark to reuse its existing */30 cron.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Gate staged-but-unmodeled outputs. <!-- evidence-open: config/evidenc…
Final score: **100**
[S352][SIL][CI/P2] Gate staged-but-unmodeled outputs. <!-- evidence-open: config/evidence-graph.json is the input the new gate reads, not the gate itself --> Fail when a workflow git adds the output of a --check-gated generator that config/evidence-graph.json does not model. That is the class that hid the sitemap strand from the cascade gate.
Why it matters: Gate staged-but-unmodeled outputs. <!-- evidence-open: config/evidence shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
Final score: **93**
[S349][OBS/P2] Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewriting them. They are published as unresolvedLegacyChecks because a challenge and a real edge outage leave an identical footprint once the shape is gone, so they cannot now be told apart. Once the edge sampler has produced a full 31-day window, the retained history ages them out naturally and the public number becomes fully classifier-current. Do NOT re-score them to improve the figure.
Why it matters: Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewrit is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Close field-vitals freshness only with real evidence. Surface observe…
Final score: **90**
[NEXT][SIL][OBS/P1] Close field-vitals freshness only with real evidence. Surface observed-through/stale-days, obtain a genuinely fresh post-S262 RUM cohort, and bind cohort verdicts to a release SHA so a fresh generated clock can never imply fresh field evidence.
Why it matters: Close field-vitals freshness only with real evidence. Surface observed is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [VERIFY] ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
Final score: **74**
[S344][DESK/P1] ESCALATION: The Desk's cadence lever is still the founder's pick -- but the S344 symptom sentence has EXPIRED. Re-probed S345: build-news-freshness --check --require-daily now reports daily - latest 2026-09-07 - age 0d, and 2 editions published on 2026-09-07. The S344 text ('nothing has published since 2026-09-04', 'degraded to periodic') was true when written and is false now; it is corrected here rather than carried, because a blocker sentence is a claim with an expiry. What is NOT resolved, and is not claimed to be: the queue-width constraint that caused the 3-day gap is UNMEASURED locally -- the radar cache is CI-only and absent from a local tree, so this session could not confirm whether the queue widened or the day was simply lucky. 2 editions against a 4-slot/day promise is a partial recovery, not a met promise. The founder's pick (widen radar yield, shorten novelty, or reduce slots) stands, and the cadence gate's reds remain HONEST (D-S344.5).
Why it matters: ESCALATION: The Desk's cadence lever is still the founder's pick -- bu is a 8-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [PRODUCT] Authorize or decline immutable warm-origin migration. D-S303 reserves…
Final score: **72**
Authorize or decline immutable warm-origin migration. D-S303 reserves the GitHub Pages rollback-origin architecture decision for the founder; the current warm origin still follows mutable main.
Why it matters: Authorize or decline immutable warm-origin migration. D-S303 reserves  is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
Final score: **69**
[S344][INFRA/P1] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is vaulted. CANON-038 makes self-hosted Postgres first choice and cloud-managed the justified exception; D-S344.2 records the justification. The shared cluster's admin DSN is ABSENT, which CANON-038 itself names as its remaining founder-aware step, so there is currently nothing to migrate to. When it exists: this is an escalation, not a task — it moves live member accounts and the sign-in path onto a single box, AGENTS.md requires escalation before changing auth flows, and the cost saving is ~zero because the Supabase free tier is already cost-neutral (CANON-029). The static site is deliberately excluded: a free global CDN is not beaten by one box.
Why it matters: Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is open, local, and unblocked — can ship this session.

#### 4. [REVENUE] Annual Stripe activation once keys exist
Final score: **68**
[OPS] Annual Stripe activation once keys exist — replace the annual placeholder path only after the real Stripe annual plan keys are created.
Why it matters: Annual Stripe activation once keys exist is on the direct checkout path; unblocking it can activate income without building new features.

#### 5. [PRODUCT] Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
Final score: **66**
[NEXT][SIL][ANALYTICA/P1] Main-domain Cloudflare Web Analytics activation receipt. Unchanged from S318.
Why it matters: Main-domain Cloudflare Web Analytics activation receipt. Unchanged fro is open, local, and unblocked — can ship this session.

### LATER

#### 1. [INTELLIGENCE] Extend proof/depth beyond the three core pages
Final score: **66**
[GENIUS][CONVERSION] Extend proof/depth beyond the three core pages — carry the stronger trust language into join/invite or other high-intent public entry routes if the next session stays conversion-focused.
Why it matters: Extend proof/depth beyond the three core pages keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 2. [VERIFY] Member-newsletter deployment and explicit arming decision remain sepa…
Final score: **65**
[S345→S347][ENG/P0] Member-newsletter deployment and explicit arming decision remain separate. S347 hardened the existing operator (8/8 focused tests); no deploy, secret update or send occurred. Management/function inspection is agent-capable; prior-session sandbox refusals are historical, not fresh human-only proof. Preserve D-S341.4 and the separate arming/first-send decision; verify the exact unauthenticated 401 guard before any approved send.
Why it matters: Member-newsletter deployment and explicit arming decision remain separ is a 352-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
Final score: **59**
[SIL][OBS/P1] Confirm the Desk surfaces cross their floors on real traffic. S319 observed that data/news-desk-engagement-history.ndjson has never existed, so the engagement path has never produced data end to end and every row correctly reads unavailable. Verify the first scheduled rum-pull run that writes a history row. Do not lower a floor to make the page look alive.
Why it matters: Confirm the Desk surfaces cross their floors on real traffic. S319 obs is a 352-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

### DEFERRED / GATED

#### 1. [PRODUCT] Ship the sampler RPC entrypoint on Ark acceptance. Ark 01K2EQ77M9F29A…
Final score: **96**
[S352][SIL][OBS/P1] Ship the sampler RPC entrypoint on Ark acceptance. Ark 01K2EQ77M9F29A0EC9619EA4BC asks studio-ops to reuse studio-ops-cron */30 via a service binding. The website half needs a node-side cloudflare:workers shim for the unit tests.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 2. [PRODUCT] Free a cron slot, or move the account to Workers Paid. S352: an agent…
Final score: **93**
[S351][OBS/P0 · FOUNDER DECISION] Free a cron slot, or move the account to Workers Paid. S352: an agent-side third option went to studio-ops via Ark (row above); this row closes if studio-ops accepts. This is the single thing standing between the studio and ever observing its own edge, and it is now a one-sentence decision rather than an investigation. Five of five free-plan cron triggers are in use by other projects. Retiring one is a live change to that project (founder call); Workers Paid raises the cap to 1,000 and is a billing action reserved to a human under CANON-019. Everything downstream is already built, deployed and verified — namespace, binding, handler, drain, 12/12 drain self-tests.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [PRODUCT] Scoped website credential owner reconciliation. Fresh S347 preflight …
Final score: **84**
[S344→S347][SEC/P0] Scoped website credential owner reconciliation. Fresh S347 preflight still reports credential-project mismatch while management/SQL/function inspection is available. Ark 01K22H17HM5F6D2952E9B84165 requests the studio-ops owner fix without exposing credentials. Owner-pending, not a claim that credentials are absent or that only the founder can act; provider truth reads remain unproven.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [PRODUCT] The Phase 0 gate is a HUMAN walkthrough and has not been run. The pla…
Final score: **81**
[S343][QA/P0] The Phase 0 gate is a HUMAN walkthrough and has not been run. The plan's own gate is a real signup in a clean browser profile with the subscribe box left checked, landing on the dashboard. The fix is verified by build:check 388/388, mobile 215/215, worker 57/57, and by reading the SERVED bundle — but not by a person actually creating an account. ~3 minutes; do it before any onboarding push.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [VERIFY] The [skip ci] publishers still do not cascade their derived artifacts…
Final score: **80**
[S351][CI/P1] The [skip ci] publishers still do not cascade their derived artifacts. b67c283d1 feat(desk): publish the latenight edition [skip ci] added news pages plus art and changed index.html at 22:20Z, then skipped CI — leaving the sitemap stale, five images missing from data/lqip-map.json, the mobile receipt bound to a superseded index.html, and the startup brief disagreeing with the shared revenue resolver. S351 ran that cascade BY HAND (lqip-map, sitemap, news-freshness, home-desk-module, oracle feed sanitizer, oracle answers, candidate manifest, plus a 215-cell mobile re-capture) and the repo was green afterwards. The debt is structural, not one bad commit: any publisher that takes [skip ci] must either run its own cascade or hand the work to a follow-up workflow. Until it does, every session that follows a publisher pays this tax. S352: the sitemap strand is closed structurally (graph node sitemap <- news/, 4 publishers fixed); the general class stays open, see the [SIL] row.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [PRODUCT] Enable the edge uptime sampler
Final score: **75**
[S349→S351][OBS/P1] Enable the edge uptime sampler — BLOCKED ON A CRON SLOT, and now precisely. S351 cleared the S350 hold (the KV namespace created on the first attempt: production-UPTIME_SAMPLES = adfe5ed60c90426ea1286321360138e3) and deployed the Worker with the binding LIVE in production. The cron was then REFUSED: Cloudflare error 10072 — Workers Free caps the account at 5 cron triggers and all five belong to other projects (seamline */5, studio-ops-cron */30, veilos hourly, velaxis-proxy ×2). No cron = no invoker = scheduled() never runs, so the flag is back to "0" and the cron is commented out; left declared it fails EVERY future Worker deploy at the trigger step, because wrangler does not roll back the successful part. Remaining work is two lines once a founder picks (a) free a slot by retiring one of the five — a live change to a different project, not this repo's call — or (b) Workers Paid, which is billing and founder-reserved under CANON-019.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [BRAND] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. …
Final score: **72**
[S337][SEC/P1] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. ambient-core.bundle.js installs the TT default policy that the site's ~167 legacy innerHTML sinks depend on, and its own comment says it "MUST load before any sink usage" — but ambient-core is not the first script on the page. Measured across 137 built pages in S337: 31 sink-bearing client assets load before it, led by pwa-nav.js (81 pages) and pwa-install.js (72). Report-Only hides this; enforcement throws. This is the concrete blocker the board has been recording as "stale soak evidence" — both are true, only this one names a defect. The repair hoists the policy installer ahead of every sink-bearing asset, which rewrites the head of every page and invalidates every hash-bound receipt at once, so it needs its own session and its own reseal budget, not a rider on a deploy. Re-measure with the scan in D-S337.3 before and after. (D-S337.3)
Why it matters: Changes public vocabulary or navigation — requires founder sign-off before user-visible copy changes.

#### 8. [SECURITY] Decide whether to arm the Monthly Member Newsletter
Final score: **69**
[S341][OPS/P1] Decide whether to arm the Monthly Member Newsletter — it has never once sent. Every scheduled run since 2026-04-02 has failed; zero successes on record. Two confirmed causes: NEWSLETTER_SECRET does not exist as a repository secret, so the workflow sends Authorization: Bearer with an empty token; and POST {SUPABASE_FUNCTION_BASE_URL}/send-member-newsletter returns 404 NOT_FOUND because supabase/functions/send-member-newsletter/ exists here but was never deployed. Not founder-blocked: supabase.management is READY, so both the deploy and the secret are agent paths (CANON-019, phantom-blocker test satisfied). Deliberately not armed because doing so emails every member on the 2nd of next month, which is not a side effect of a website deploy session (D-S341.4). If armed: deploy the function, mint the secret, dispatch ONE manual run before the cron fires.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. Gate staged-but-unmodeled outputs. <!-- evidence-open: config/evidenc…
2. Post-push CI confirmation
3. Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
4. Close field-vitals freshness only with real evidence. Surface observe…
5. ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
6. Authorize or decline immutable warm-origin migration. D-S303 reserves…
7. Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
8. Annual Stripe activation once keys exist
9. Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
10. Extend proof/depth beyond the three core pages
11. Member-newsletter deployment and explicit arming decision remain sepa…
12. Confirm the Desk surfaces cross their floors on real traffic. S319 ob…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
