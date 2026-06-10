# Genius Hit List — Session 182

Generated: 2026-06-10
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **85/100**
- Health: **green**
- Current SIL: **950/500**
- CI health: **check gh run list**
- Current focus: S182 recovered a real production outage (Worker apex self-loop after Pages migration) — fixed by by-hostname origin fetch + a post-deploy liveness gate + auto-rollback; site healthy (6/6 smoke). Then full 9-axis audit (23 items) + /implement shipped 7 (reliability + maintainability). build:check is NOT green locally (non-deterministic --check gates, audit #23).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] DEPLOY-EDGE-FN-SECURITY-FIXES. supabase functions deploy create-check…
Final score: **100**
[S182][REL/P1] DEPLOY-EDGE-FN-SECURITY-FIXES. supabase functions deploy create-checkout stripe-webhook assign-discord-role odds to make the S182 error-redaction + CORS fixes live (committed but not yet deployed; no CI deploy exists for edge fns).
Why it matters: DEPLOY-EDGE-FN-SECURITY-FIXES. supabase functions deploy create-checko shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [INTELLIGENCE] WORKER-UNIT-TESTS. Audit #14: the ~800-line Worker has zero unit cove…
Final score: **96**
[S182][REL/P1] WORKER-UNIT-TESTS. Audit #14: the ~800-line Worker has zero unit coverage. Add tests/worker.unit.spec.js (Miniflare): assert toOrigin never yields the apex host, a hanging primary fails over within 8s, CSRF verify rejects tampered/expired tokens.
Why it matters: WORKER-UNIT-TESTS. Audit #14: the ~800-line Worker has zero unit cover keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 3. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 4. [INTELLIGENCE] NONDETERMINISTIC-CHECK-GATES. Audit #23: make build-ignis-search-inde…
Final score: **93**
[S182][MAINT/P1] NONDETERMINISTIC-CHECK-GATES. Audit #23: make build-ignis-search-index + sanitize-public-oracle-feed deterministic in --check (strip/round timestamps, freeze live inputs) so build:check can actually go green locally. Verify: build then build:check twice, no commit between.
Why it matters: NONDETERMINISTIC-CHECK-GATES. Audit #23: make build-ignis-search-index keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

### NEXT

#### 1. [INTELLIGENCE] NON-DATACENTER-UPTIME-PROBE. Audit #10: add a CF Cron / external brow…
Final score: **90**
[S182][REL/P2] NON-DATACENTER-UPTIME-PROBE. Audit #10: add a CF Cron / external browser monitor from a non-datacenter egress that asserts apex 200 + marker (current probes are all bot-challenged from datacenter and blind to the real failure shape).
Why it matters: NON-DATACENTER-UPTIME-PROBE. Audit #10: add a CF Cron / external brows keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [VERIFY] TT-ENFORCE-REPROBE. Now due (~2026-06-12): node scripts/probe-tt-soak…
Final score: **81**
[S180][SECURITY/P1] TT-ENFORCE-REPROBE. Now due (~2026-06-12): node scripts/probe-tt-soak.mjs && node scripts/analyze-tt-violations.mjs; S176 default-policy bridge should show near-zero new clusters → if clean, enforce-flip decision (founder device verify per SOUL #3).
Why it matters: TT-ENFORCE-REPROBE. Now due (~2026-06-12): was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict…
Final score: **81**
[S180][PERF/P1] ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict still PENDING (≥5/side not yet accrued; signal −83%). Once it confirms, api/field-win.json flips hasConfirmed:true and the /status/ "Biggest measured win" tile auto-lights — confirm it renders, then celebrate or regress-hunt with lib/perf-forensics.mjs.
Why it matters: ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict  is open, local, and unblocked — can ship this session.

#### 5. [COHESION] STATUS-PROOF-INDEX. Consider merging AI discovery, uptime, field wins…
Final score: **77**
[S181→NEXT][PROOF/P2] STATUS-PROOF-INDEX. Consider merging AI discovery, uptime, field wins, staging, and public contracts into one public-safe /api/status-proof.json manifest so /status/ fetches one proof surface.
Why it matters: STATUS-PROOF-INDEX. Consider merging AI discovery, uptime, field wins, is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

### LATER

#### 1. [VERIFY] UPTIME-PUBLISH-VERIFY. Confirm the first commit-worthy uptime-probe.y…
Final score: **75**
[S180][OBS/P2] UPTIME-PUBLISH-VERIFY. Confirm the first commit-worthy uptime-probe.yml run committed api/uptime.json + a history row (Actions tab / git log --author=github-actions), and that /status/ shows a real availability %. First low-churn commit is the smoke test.
Why it matters: UPTIME-PUBLISH-VERIFY. Confirm the first commit-worthy uptime-probe.ym was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [PRODUCT] GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP…
Final score: **75**
[S180][OBS/P3] GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP confirms the origin-migration win globally as samples grow.
Why it matters: GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP  is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] TASKBOARD-AUTO-CONSOLIDATOR. Add a safe --apply mode to rename older …
Final score: **69**
[S181→NEXT][PROCESS/P2] TASKBOARD-AUTO-CONSOLIDATOR. Add a safe --apply mode to rename older active runway/founder-action headings to historical form after closeout while preserving content.
Why it matters: TASKBOARD-AUTO-CONSOLIDATOR. Add a safe --apply mode to rename older a is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. DEPLOY-EDGE-FN-SECURITY-FIXES. supabase functions deploy create-check…
2. WORKER-UNIT-TESTS. Audit #14: the ~800-line Worker has zero unit cove…
3. Post-push CI confirmation
4. NONDETERMINISTIC-CHECK-GATES. Audit #23: make build-ignis-search-inde…
5. NON-DATACENTER-UPTIME-PROBE. Audit #10: add a CF Cron / external brow…
6. Forge Window naming propagation
7. TT-ENFORCE-REPROBE. Now due (~2026-06-12): node scripts/probe-tt-soak…
8. ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict…
9. STATUS-PROOF-INDEX. Consider merging AI discovery, uptime, field wins…
10. UPTIME-PUBLISH-VERIFY. Confirm the first commit-worthy uptime-probe.y…
11. GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP…
12. TASKBOARD-AUTO-CONSOLIDATOR. Add a safe --apply mode to rename older …

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
