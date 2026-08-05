# Genius Hit List — Session 305

Generated: 2026-08-05
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **81/100**
- Health: **yellow**
- Current SIL: **984/1000**
- CI health: **check gh run list**
- Current focus: S305 recovery verified the interrupted identity/news/UX wave instead of trusting its interim closeout. Provider journey receipts and watch mode are shipped; Obelisk revoke/logout is live; generator convergence, collision-free preview crawling, provider-origin deploy observation, and three stale browser contracts are root-fixed. The exact recovery candidate is remotely verified on canonical staging (receipt 69a1a3cd02cdddf1d9316100, chain 31). Production remains gated because Obelisk has not registered the canonical staging callback and the content shell is honestly 796 commits / 11.9 days stale.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Promote production
Final score: **97**
[S305][RELEASE/P0] Promote production — when the receipt reads verified/blockers=[]: flip context/PRODUCTION_PROMOTION.json to ready, gate self-test, commit, dispatch pages-deploy with confirm_production=true, live-verify /vault-member/ serves the Obelisk UI.
Why it matters: Promote production shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 2. [PRODUCT] Register the canonical staging callback in Obelisk. Exact staging bro…
Final score: **96**
[S305][XREPO/RELEASE/P0] Register the canonical staging callback in Obelisk. Exact staging browser proof reaches /auth/authorize, which currently returns tenant-boundary-redirect-origin-not-registered-to-client for https://website.staging.vaultsparkstudios.com/auth/callback. Signed Ark request 01JV7U1UQ309B28328DCEF5A95 is with the active Obelisk owner: retain production callback, add the exact staging callback, prove cross-client redirect denial, deploy, live-probe. This is a real release-gate blocker; never bypass the tenant boundary.
Why it matters: Register the canonical staging callback in Obelisk. Exact staging brow is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 4. [COHESION] Put explicit staging-release browser contracts on the release-gate pa…
Final score: **95**
[S305→NEXT][SIL][TEST/P2] Put explicit staging-release browser contracts on the release-gate path. The suites existed but were not in build:check; three assertions had aged behind lazy sheet construction, 4/4 control-plane truth, and /auth/authorize discovery. Gate them at release time with the staging URL required (never SKIP-as-pass).
Why it matters: Put explicit staging-release browser contracts on the release-gate pat is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

### NEXT

#### 1. [PRODUCT] Preflight tile in the startup brief
Final score: **87**
[S304][SIL][UX/P2] Preflight tile in the startup brief — surface "a confirm_content dispatch would deploy N pages" from .cache/preflight-lane-output.txt.
Why it matters: Preflight tile in the startup brief is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Link-failure nonzero alerting
Final score: **86**
[S304][SIL][SEC/P2] Link-failure nonzero alerting — a nonzero KV aggregate emits a CI-beacon warning / Ark session-note.
Why it matters: Link-failure nonzero alerting shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [PRODUCT] Revive geo-vitals ingestion. dataWindow is honest but the corpus is f…
Final score: **81**
[S304→NEXT][SPEED/P2] Revive geo-vitals ingestion. dataWindow is honest but the corpus is frozen at 2026-07-02 — .cache/rum-raw partitions stopped refilling when the R2 export path died with the /v/rum 405 era. Deliverable: post-restore geo accrual (either an R2 geo-partition export in rum-pull.yml or deriving country slices worker-side); acceptance: dataWindow.lastDay within 48h and build-geo-vitals --check reproducible. <!-- evidence-open: the deliverable is a working accrual path that does not exist; the named files are context. -->
Why it matters: Revive geo-vitals ingestion. dataWindow is honest but the corpus is fr is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Wire capture-theme-matrix.mjs into /app-release-gate as a blocking pr…
Final score: **78**
[S303][SIL][UX/P2] Wire capture-theme-matrix.mjs into /app-release-gate as a blocking pre-SPARKED step (auto-capture + review of flagged pairs).
Why it matters: Wire capture-theme-matrix.mjs into /app-release-gate as a blocking pre is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] context-meter.mjs publishes a false green. It reported "1.5% used · C…
Final score: **72**
[S302→NEXT][OBS/P2] context-meter.mjs publishes a false green. It reported "1.5% used · CONTINUE" for the entire session while the live conversation was near exhaustion, because it measures a heuristic fresh-session bootstrap cost rather than the session it claims to gauge. Same class as CANON-036's deploy-currency probe verifying a *declaration* instead of the condition. Either measure the real thing or rename what it reports.
Why it matters: context-meter.mjs publishes a false green. It reported "1.5% used · CO is open, local, and unblocked — can ship this session.

### LATER

#### 1. [COHESION] Structured receipt on Obelisk link FAILURE. Today a failed link logs …
Final score: **68**
[S301→NEXT][OBS/P2] Structured receipt on Obelisk link FAILURE. Today a failed link logs a code and redirects to ?auth_error=bridge_failed; the member sees a generic failure and we learn nothing. A privacy-safe failure receipt (code, plane, no identifiers) makes first-login problems diagnosable at the moment they matter most — when the first real people arrive.
Why it matters: Structured receipt on Obelisk link FAILURE. Today a failed link logs a is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 2. [PRODUCT] /proof verification permalink + footer badge
Final score: **63**
[S303][SIL][DEPTH/P2] /proof verification permalink + footer badge — shareable ?verified=<head> link and a small independently-verifiable badge linking to /proof.
Why it matters: /proof verification permalink + footer badge is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Wave D depth. /proof public in-browser verifier (the transparency app…
Final score: **57**
[S300][AGENT/P2] Wave D depth. /proof public in-browser verifier (the transparency apparatus is this project's most under-exploited asset); feedback→changelog provenance trace; progression next-action spine; agent capability manifest. See docs/AUDIT_2026-07-31.md.
Why it matters: Wave D depth. /proof public in-browser verifier (the transparency appa is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [VERIFY] Open Obelisk public registration when the provider owner confirms its…
Final score: **100**
[S305][FOUNDER/P0] Open Obelisk public registration when the provider owner confirms its gate. Unset OBELISK_SIGNUP_TOKEN on CPX51 per D-S242.1/D-2026-06-09; verify live before changing website create-account copy.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [VERIFY] One founder sign-in through the verifier
Final score: **97**
[S305][FOUNDER/P0] One founder sign-in through the verifier — once Obelisk W242 is live: node scripts/verify-provider-journey.mjs --live, complete the Obelisk ceremony in the opened browser; the verifier records all five legs and rebuilds the receipt.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [VERIFY] Create-account copy tracks the enrollment gate. vault-member/index.ht…
Final score: **94**
[S305][UX/P1] Create-account copy tracks the enrollment gate. vault-member/index.html explains "Enrollment is currently invite-led inside Obelisk" <!-- evidence-open: the deliverable is the COPY SWAP after a live probe proves enrollment is open — the named file is context --> — once the Obelisk deploy opens enrollment (verify live, never assume), replace with plain create-account language before or with the promotion dispatch. Never ship open-enrollment copy while the provider still gates registration.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [COHESION] Make relying-party staging callbacks an executable pre-deploy contrac…
Final score: **92**
[S305→NEXT][SIL][RELEASE/P1] Make relying-party staging callbacks an executable pre-deploy contract. Compare every deployable project's declared stagingUrl/auth/callback against the Obelisk client registry before staging, with exact-match and cross-client negative controls. The S305 release gate found the missing registration only after deployment.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [SECURITY] Three one-look items: CF token scopes (Zone.Cache Purge + zone-route …
Final score: **82**
[S304→NEXT][FOUNDER] Three one-look items: CF token scopes (Zone.Cache Purge + zone-route edit — purge success:false and staging deploy error 10000 both trace to scope), GitHub Actions secret SUPABASE_ACCESS_TOKEN (enables the daily link-readiness cron), Zoho contact-email migration per new D-S259.2 (agent preps DNS records + verifies delivery once the mailbox alias exists).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [BRAND] The genius-list rationale generator false-positives on the word "navi…
Final score: **78**
[S302→NEXT][OBS/P2] The genius-list rationale generator false-positives on the word "navigation". It classified a JS error-handling fix as "affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes" purely because the description contained the View Transitions *navigation* API. The gate that consumes it is correct and caught the leak honestly — the defect is the heuristic upstream, which treats a technical term as a copy-change signal. Reworded the description to unblock; the heuristic still needs narrowing so it does not quietly gate real agent work.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [BRAND] Schedule check-obelisk-link-readiness.mjs. The gauge is built and gre…
Final score: **75**
[S301→NEXT][OBS/P2][FOUNDER-PRECONDITION] Schedule check-obelisk-link-readiness.mjs. The gauge is built and green but runs only on demand, because it needs SUPABASE_ACCESS_TOKEN and the studio-ops secrets gateway does not exist on a GitHub runner. Add it as a repository Actions secret and the gauge can run daily — watching duplicate emails, duplicate subjects, mixed-case emails, and scan headroom. Adding the cron *first* would publish a permanently unavailable signal, which is the producer-never-built antipattern; the precondition comes first.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [SECURITY] Login pages every user on every callback. scanSupabaseUsers walks /au…
Final score: **70**
[S301→NEXT][SEC/P2][FOUNDER] Login pages every user on every callback. scanSupabaseUsers walks /auth/v1/admin/users 100 at a time, up to 20 pages, per sign-in — 3 requests today, and at 2,000 accounts it throws supabase_user_scan_limit and every login fails. Fails closed, so a capacity cliff at ~8× current scale, not a security hole. Headroom instrumented (1,748 accounts) by check-obelisk-link-readiness.mjs. Fix designed — an indexed security definer lookup, additive with fallback to the existing scan — and deliberately not applied: it touches the authentication flow, which AGENTS.md puts behind founder escalation.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Promote production
2. Register the canonical staging callback in Obelisk. Exact staging bro…
3. Post-push CI confirmation
4. Put explicit staging-release browser contracts on the release-gate pa…
5. Preflight tile in the startup brief
6. Link-failure nonzero alerting
7. Revive geo-vitals ingestion. dataWindow is honest but the corpus is f…
8. Wire capture-theme-matrix.mjs into /app-release-gate as a blocking pr…
9. context-meter.mjs publishes a false green. It reported "1.5% used · C…
10. Structured receipt on Obelisk link FAILURE. Today a failed link logs …
11. /proof verification permalink + footer badge
12. Wave D depth. /proof public in-browser verifier (the transparency app…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
