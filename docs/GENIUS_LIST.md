# Genius Hit List — Session 305

Generated: 2026-08-04
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **80/100**
- Health: **yellow**
- Current SIL: **991/1000**
- CI health: **check gh run list**
- Current focus: S304 executed both founder approvals to live-verified completion and then audited its own wave: /proof is fully live on production (page, hashed verifier, constellation, the ledger itself — plus telemetry, a shareable ?verified permalink, skew-vs-tamper honesty, and a sitewide footer badge); public.obelisk_identity_link is live end-to-end (catalog-verified RLS, CI-deployed fast path, receipts reader publishing an honest zero). The retrospective shipped 12 of 13 hardening items — six new executing gates including a theme-boot contract with real DOMTokenList this-semantics and a verifier↔writer binding across every committed ledger row — and the staging ceremony advanced the public chain to depth 28, collapsing release-proof blockers from 9 to 4, all four being the single external real-provider-e2e condition.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Promote production
Final score: **100**
[S305][RELEASE/P0] Promote production — when the receipt reads verified/blockers=[]: flip context/PRODUCTION_PROMOTION.json to ready, gate self-test, commit, dispatch pages-deploy with confirm_production=true, live-verify /vault-member/ serves the Obelisk UI.
Why it matters: Promote production shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Preflight tile in the startup brief
Final score: **93**
[S304][SIL][UX/P2] Preflight tile in the startup brief — surface "a confirm_content dispatch would deploy N pages" from .cache/preflight-lane-output.txt.
Why it matters: Preflight tile in the startup brief is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Link-failure nonzero alerting
Final score: **92**
[S304][SIL][SEC/P2] Link-failure nonzero alerting — a nonzero KV aggregate emits a CI-beacon warning / Ark session-note.
Why it matters: Link-failure nonzero alerting shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [PRODUCT] Revive geo-vitals ingestion. dataWindow is honest but the corpus is f…
Final score: **87**
[S304→NEXT][SPEED/P2] Revive geo-vitals ingestion. dataWindow is honest but the corpus is frozen at 2026-07-02 — .cache/rum-raw partitions stopped refilling when the R2 export path died with the /v/rum 405 era. Deliverable: post-restore geo accrual (either an R2 geo-partition export in rum-pull.yml or deriving country slices worker-side); acceptance: dataWindow.lastDay within 48h and build-geo-vitals --check reproducible. <!-- evidence-open: the deliverable is a working accrual path that does not exist; the named files are context. -->
Why it matters: Revive geo-vitals ingestion. dataWindow is honest but the corpus is fr is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Wire capture-theme-matrix.mjs into /app-release-gate as a blocking pr…
Final score: **84**
[S303][SIL][UX/P2] Wire capture-theme-matrix.mjs into /app-release-gate as a blocking pre-SPARKED step (auto-capture + review of flagged pairs).
Why it matters: Wire capture-theme-matrix.mjs into /app-release-gate as a blocking pre is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] context-meter.mjs publishes a false green. It reported "1.5% used · C…
Final score: **78**
[S302→NEXT][OBS/P2] context-meter.mjs publishes a false green. It reported "1.5% used · CONTINUE" for the entire session while the live conversation was near exhaustion, because it measures a heuristic fresh-session bootstrap cost rather than the session it claims to gauge. Same class as CANON-036's deploy-currency probe verifying a *declaration* instead of the condition. Either measure the real thing or rename what it reports.
Why it matters: context-meter.mjs publishes a false green. It reported "1.5% used · CO is open, local, and unblocked — can ship this session.

#### 4. [COHESION] Structured receipt on Obelisk link FAILURE. Today a failed link logs …
Final score: **74**
[S301→NEXT][OBS/P2] Structured receipt on Obelisk link FAILURE. Today a failed link logs a code and redirects to ?auth_error=bridge_failed; the member sees a generic failure and we learn nothing. A privacy-safe failure receipt (code, plane, no identifiers) makes first-login problems diagnosable at the moment they matter most — when the first real people arrive.
Why it matters: Structured receipt on Obelisk link FAILURE. Today a failed link logs a is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 5. [PRODUCT] /proof verification permalink + footer badge
Final score: **69**
[S303][SIL][DEPTH/P2] /proof verification permalink + footer badge — shareable ?verified=<head> link and a small independently-verifiable badge linking to /proof.
Why it matters: /proof verification permalink + footer badge is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] Wave D depth. /proof public in-browser verifier (the transparency app…
Final score: **63**
[S300][AGENT/P2] Wave D depth. /proof public in-browser verifier (the transparency apparatus is this project's most under-exploited asset); feedback→changelog provenance trace; progression next-action spine; agent capability manifest. See docs/AUDIT_2026-07-31.md.
Why it matters: Wave D depth. /proof public in-browser verifier (the transparency appa is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Kill the login scan cliff with public.obelisk_identity_link
Final score: **60**
[S301→NEXT][SEC/P1] Kill the login scan cliff with public.obelisk_identity_link — the auth-schema route is closed (D-S301.10). Founder approved the auth-flow change; implementation disproved the plan and it was reverted rather than shipped half-safe. Two hard findings: (1) a unique index on auth.users is impossible — Supabase returns 42501: must be owner of table users; (2) the email filter fast path is not safe alone, because taking it skips the pre-write subject scan, so a duplicate would be caught only after the metadata write — an existing unit test caught the degradation from identity_subject_duplicate to a generic error. Correct design: a link table in our own schema (obelisk_sub PK, user_id unique), inserted *before* the app_metadata write so an interruption leaves a self-healing orphan link row rather than an orphan metadata write. It supplies the uniqueness auth denies us AND an indexed subject lookup, killing both full table walks instead of one. Live facts to build on: GoTrue filter genuinely narrows (exact email → 1 of 252) but is case-sensitive, so a miss must fall back; 0 mixed-case emails and 0 case-collision groups today, which is the invariant the filter's completeness rests on. <!-- evidence-open: the deliverable is public.obelisk_identity_link plus the worker rewiring, neither of which exists. The files this item names are the affected context. -->
Why it matters: Kill the login scan cliff with public.obelisk_identity_link is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Served-surface continuity registry. Generalize the S299 anchor+compar…
Final score: **60**
[S299→NEXT][SIL][OBS/P2] Served-surface continuity registry. Generalize the S299 anchor+compare pattern from {receipt, ledger} to the whole candidate CORE_PATHS served set in one bounded checker (build-sha, worker-route-provenance, public-intelligence, shell assets).
Why it matters: Served-surface continuity registry. Generalize the S299 anchor+compare is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [VERIFY] One founder sign-in through the verifier
Final score: **97**
[S305][FOUNDER/P0] One founder sign-in through the verifier — once Obelisk W242 is live: node scripts/verify-provider-journey.mjs --live, complete the Obelisk ceremony in the opened browser; the verifier records all five legs and rebuilds the receipt.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [VERIFY] Create-account copy tracks the enrollment gate. vault-member/index.ht…
Final score: **94**
[S305][UX/P1] Create-account copy tracks the enrollment gate. vault-member/index.html explains "Enrollment is currently invite-led inside Obelisk" — once the Obelisk deploy opens enrollment (verify live, never assume), replace with plain create-account language before or with the promotion dispatch. Never ship open-enrollment copy while the provider still gates registration. <!-- evidence-open: vault-member/index.html is the canvas, not the deliverable; copy updates only after Obelisk opens self-service enrollment -->
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [SECURITY] Three one-look items: CF token scopes (Zone.Cache Purge + zone-route …
Final score: **85**
[S304→NEXT][FOUNDER] Three one-look items: CF token scopes (Zone.Cache Purge + zone-route edit — purge success:false and staging deploy error 10000 both trace to scope), GitHub Actions secret SUPABASE_ACCESS_TOKEN (enables the daily link-readiness cron), Zoho contact-email migration per new D-S259.2 (agent preps DNS records + verifies delivery once the mailbox alias exists).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [PRODUCT] Two one-line founder actions unlock everything (both Obelisk-side): (…
Final score: **84**
[S305][FOUNDER/P0] Two one-line founder actions unlock everything (both Obelisk-side): (1) send the Obelisk session a live message naming production for the W242 deploy (their D-S233.3 requires it — check-discovery-correspondence goes green with the deploy); (2) unset OBELISK_SIGNUP_TOKEN on CPX51 to open public registration (declared default per their D-S242.1; founder-run per their D-2026-06-09).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [BRAND] The genius-list rationale generator false-positives on the word "navi…
Final score: **81**
[S302→NEXT][OBS/P2] The genius-list rationale generator false-positives on the word "navigation". It classified a JS error-handling fix as "affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes" purely because the description contained the View Transitions *navigation* API. The gate that consumes it is correct and caught the leak honestly — the defect is the heuristic upstream, which treats a technical term as a copy-change signal. Reworded the description to unblock; the heuristic still needs narrowing so it does not quietly gate real agent work.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [BRAND] Schedule check-obelisk-link-readiness.mjs. The gauge is built and gre…
Final score: **78**
[S301→NEXT][OBS/P2][FOUNDER-PRECONDITION] Schedule check-obelisk-link-readiness.mjs. The gauge is built and green but runs only on demand, because it needs SUPABASE_ACCESS_TOKEN and the studio-ops secrets gateway does not exist on a GitHub runner. Add it as a repository Actions secret and the gauge can run daily — watching duplicate emails, duplicate subjects, mixed-case emails, and scan headroom. Adding the cron *first* would publish a permanently unavailable signal, which is the producer-never-built antipattern; the precondition comes first.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [SECURITY] Login pages every user on every callback. scanSupabaseUsers walks /au…
Final score: **73**
[S301→NEXT][SEC/P2][FOUNDER] Login pages every user on every callback. scanSupabaseUsers walks /auth/v1/admin/users 100 at a time, up to 20 pages, per sign-in — 3 requests today, and at 2,000 accounts it throws supabase_user_scan_limit and every login fails. Fails closed, so a capacity cliff at ~8× current scale, not a security hole. Headroom instrumented (1,748 accounts) by check-obelisk-link-readiness.mjs. Fix designed — an indexed security definer lookup, additive with fallback to the existing scan — and deliberately not applied: it touches the authentication flow, which AGENTS.md puts behind founder escalation.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [PRODUCT] Decide whether to dispatch confirm_content. Lane built, 52/52, dry-ru…
Final score: **69**
[S300][FOUNDER/P0][HUMAN] Decide whether to dispatch confirm_content. Lane built, 52/52, dry-run 211 promotable / 321 withheld against the real backlog. Ends a 413-commit / 7.1-day staleness without releasing the identity hold. Deliberately not dispatched.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Promote production
2. Post-push CI confirmation
3. Preflight tile in the startup brief
4. Link-failure nonzero alerting
5. Revive geo-vitals ingestion. dataWindow is honest but the corpus is f…
6. Wire capture-theme-matrix.mjs into /app-release-gate as a blocking pr…
7. context-meter.mjs publishes a false green. It reported "1.5% used · C…
8. Structured receipt on Obelisk link FAILURE. Today a failed link logs …
9. /proof verification permalink + footer badge
10. Wave D depth. /proof public in-browser verifier (the transparency app…
11. Kill the login scan cliff with public.obelisk_identity_link
12. Served-surface continuity registry. Generalize the S299 anchor+compar…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
