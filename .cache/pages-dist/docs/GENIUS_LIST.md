# Genius Hit List — Session 173

Generated: 2026-06-05
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **85/100**
- Health: **green**
- Current SIL: **998/500**
- CI health: **check gh run list**
- Current focus: Session 173 ran the full /start → /audit → /implement → /closeout goal-chain and shipped 14/14 audit items (Priority 344.1; expected impact 94/100). Homepage critical CSS is now generated-shell-only, local LCP autopsy is 324ms with timed visual proof, guarded ambient modules moved behind a predicate loader (base ambient 27 sources / 104.5KB), SW shell coherency is gated, RUM strictness is a sample ladder, TT soak evidence now shows 81 violations instead of false emptiness, membership interview intent feeds the rank proof loop, and staging parity is measured as yellow. Verification: npm run build + npm run build:check green end-to-end (108-page crawl, 0 failures).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] HOMEPAGE-FIELD-LCP-FIELD-VERIFY. Deploy/field-verify the critical-CSS…
Final score: **100**
[S174][PERF/P1] HOMEPAGE-FIELD-LCP-FIELD-VERIFY. Deploy/field-verify the critical-CSS de-dupe + ambient split. Run npm run rum:pull, compare data/rum-summary.json, then let scripts/check-rum-strict-ladder.mjs decide strict readiness instead of guessing from synthetic traces.
Why it matters: HOMEPAGE-FIELD-LCP-FIELD-VERIFY. Deploy/field-verify the critical-CSS  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [SECURITY] TT-VIOLATION-BURNDOWN. docs/TT_SOAK_EVIDENCE_2026-06-05.md shows 81 v…
Final score: **96**
[S174][SECURITY/P1] TT-VIOLATION-BURNDOWN. docs/TT_SOAK_EVIDENCE_2026-06-05.md shows 81 violations after the 100%-sample soak. Inspect the sink clusters, fix remaining DOM sinks, then rerun node scripts/probe-tt-soak.mjs before any enforce canary.
Why it matters: TT-VIOLATION-BURNDOWN. docs/TT_SOAK_EVIDENCE_2026-06-05.md shows 81 vi lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 3. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 4. [PRODUCT] RUM-ACCRUAL-WATCH. Current ladder: 33 total samples; / needs 37 more …
Final score: **93**
[S174][DATA/P1] RUM-ACCRUAL-WATCH. Current ladder: 33 total samples; / needs 37 more route samples for strict evaluation. Keep npm run rum:pull in start/closeout until the route clears the 50-sample floor.
Why it matters: RUM-ACCRUAL-WATCH. Current ladder: 33 total samples; / needs 37 more r is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] STAGING-PARITY-YELLOW-FIX. api/staging-health.json is yellow: product…
Final score: **87**
[S174][OPS/P2] STAGING-PARITY-YELLOW-FIX. api/staging-health.json is yellow: production and staging are reachable, but sampled shell/header parity differs. Repair staging drift before treating CANON-007 as green.
Why it matters: STAGING-PARITY-YELLOW-FIX. api/staging-health.json is yellow: producti is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [VERIFY] MEMBERSHIP-PROOF-LOOP-DEVICE-VERIFY. Verify the interview → rank-econ…
Final score: **85**
[S174][UX/P2] MEMBERSHIP-PROOF-LOOP-DEVICE-VERIFY. Verify the interview → rank-economy proof loop on a real mobile device; the agent path is implemented, but the membership promise deserves one tactile pass.
Why it matters: MEMBERSHIP-PROOF-LOOP-DEVICE-VERIFY. Verify the interview shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 4. [PRODUCT] ARK-SIGNATURE-FAILURE-REPAIR. Use docs/ARK_SIGNATURE_FAILURE_DOSSIER_…
Final score: **84**
[S174][ECOSYSTEM/P2] ARK-SIGNATURE-FAILURE-REPAIR. Use docs/ARK_SIGNATURE_FAILURE_DOSSIER_2026-06-04.md to coordinate the 3 failed cargo signatures with studio-ops instead of leaving Ark health as background noise.
Why it matters: ARK-SIGNATURE-FAILURE-REPAIR. Use docs/ARK_SIGNATURE_FAILURE_DOSSIER_2 is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] Delete assets/vaultsparked-proof.js? (30-second yes/no). Evidence-com…
Final score: **78**
Delete assets/vaultsparked-proof.js? (30-second yes/no). Evidence-complete: superseded by live-proof.js which writes the same IDs + more; not loaded anywhere. Current founder-facing decision doc: docs/MEMBERSHIP_ORPHAN_DECISION.md.
Why it matters: Delete assets/vaultsparked-proof.js? (30-second yes/no). Evidence-comp is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] EDGE-PERSONALIZATION-READINESS. Resume docs/OBELISK_EDGE_PERSONALIZAT…
Final score: **75**
[S168][OBELISK/P1] EDGE-PERSONALIZATION-READINESS. Resume docs/OBELISK_EDGE_PERSONALIZATION_PLAN.md only after Obelisk Phase 2 declares stable session cookie/capability shape.
Why it matters: EDGE-PERSONALIZATION-READINESS. Resume docs/OBELISK_EDGE_PERSONALIZATI is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] When data/rum-summary.json shows ≥50 samples on /, flip check-perf-bu…
Final score: **72**
[S164→RUM-STRICT-FLIP] When data/rum-summary.json shows ≥50 samples on /, flip check-perf-budget.mjs --source=rum to --strict in build:check + log DECISIONS. The loop is wired (S163); waiting on field data to accumulate in R2. Resolves ABSOLUTE-LCP-ORIGIN-CEILING + the synthetic-trace saga.
Why it matters: When data/rum-summary.json shows ≥50 samples on /, flip check-perf-bud is open, local, and unblocked — can ship this session.

#### 3. [INTELLIGENCE] RUM-ANOMALY-CANARY
Final score: **72**
[S164][AI/P2] RUM-ANOMALY-CANARY — week-over-week field-LCP anomaly signal (audit #10). Depends on RUM-STRICT-FLIP + ~1 week of samples. Extend pull-rum-summary.mjs with weekly snapshot deltas.
Why it matters: RUM-ANOMALY-CANARY keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

## Recommended Build Order

1. HOMEPAGE-FIELD-LCP-FIELD-VERIFY. Deploy/field-verify the critical-CSS…
2. TT-VIOLATION-BURNDOWN. docs/TT_SOAK_EVIDENCE_2026-06-05.md shows 81 v…
3. Post-push CI confirmation
4. RUM-ACCRUAL-WATCH. Current ladder: 33 total samples; / needs 37 more …
5. STAGING-PARITY-YELLOW-FIX. api/staging-health.json is yellow: product…
6. Forge Window naming propagation
7. MEMBERSHIP-PROOF-LOOP-DEVICE-VERIFY. Verify the interview → rank-econ…
8. ARK-SIGNATURE-FAILURE-REPAIR. Use docs/ARK_SIGNATURE_FAILURE_DOSSIER_…
9. Delete assets/vaultsparked-proof.js? (30-second yes/no). Evidence-com…
10. EDGE-PERSONALIZATION-READINESS. Resume docs/OBELISK_EDGE_PERSONALIZAT…
11. When data/rum-summary.json shows ≥50 samples on /, flip check-perf-bu…
12. RUM-ANOMALY-CANARY

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
