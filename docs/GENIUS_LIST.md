# Genius Hit List — Session 232

Generated: 2026-06-28
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **80/100**
- Health: **green**
- Current SIL: **992/500**
- CI health: **check gh run list**
- Current focus: S232 (arc) - verified every audit premise against live code, turning a stale carry-list into honest closes plus sharper instruments. Closed the only 2 real STRONG canon gaps (conformance 2 GAP -> 0 GAP): created prompts/initiate.md (CANON-003) and re-synced docs/SESSION_PROTOCOL.md v1.3->v1.5 (CANON-044 Wave-scaffold marker). Confirmed CI is GREEN on the S231 tip (E2E 13m / Lighthouse 8m / Accessibility all success) -> closed 6 stale [VERIFY] carries. Shipped real residual value where audit items were partly-done: workflow-install lint is now lockfile-presence-aware (git ls-files, any manager, correct for any repo); build-lqip-map got a coverage-preserving write that reuses committed base64 and only encodes new keys -> kills the Windows<->Linux churn the S231 carry flagged (npm run build now leaves git status clean); inp-telemetry.js now captures a stable target hint plus INP phase breakdown so the first /games/ slow sample pins the offender. Second-order: built check-propagated-doc-currency.mjs (plus doctor probe) to close the propagation-drift class found in Waves 1-2. build:check EXIT 0 verified directly; doctor blockingFailing 0 (3 advisory rows are all sibling/portfolio, untouched).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] INP slow-interaction consumer
Final score: **96**
[SIL][OBSERVABILITY/P2] INP slow-interaction consumer — once the enriched telemetry returns its first inp:slow_interaction sample, build a small rollup over the new target/inputDelay/processing/presentation fields so the dominant /games/ offender + its phase surface in the RUM summary automatically (closes the loop the S232 enrichment opened).
Why it matters: INP slow-interaction consumer is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] INP root-fix
Final score: **90**
[PERF/P1] INP root-fix — once inp-telemetry.js has 2–3 days of field data (0 inp:slow_interaction samples as of S231), fix the dominant slow interaction on /games/.
Why it matters: INP root-fix is open, local, and unblocked — can ship this session.

#### 4. [BRAND] Forge Window naming
Final score: **87**
[BRAND/FOUNDER] Forge Window naming — rename "Studio Pulse"→"Forge Window" across 108 public pages is a founder-gated public-vocabulary change (keep /studio-pulse/ URL for SEO). Needs sign-off on the public name.
Why it matters: Forge Window naming affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [PRODUCT] Generalize the blockDays trust-ceiling
Final score: **84**
[INFRA/P2] Generalize the blockDays trust-ceiling — extend the expire-don't-warn blocking pattern to other public-trust surfaces that currently only warn (status-proof feeds, uptime publish age). One blocking ceiling per visitor-noticeable surface.
Why it matters: Generalize the blockDays trust-ceiling is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Ark-share the two reusable gate patterns
Final score: **81**
[SIL][INFRA/P2] Ark-share the two reusable gate patterns — ship check-propagated-doc-currency + the lockfile-presence-aware install lint as pattern-share cargo so siblings with the same gitignored-lockfile + propagated-doc setup (Hashmark/SHADOW/ATLAS literally show the drift) inherit the class-closers without anyone editing their trees.
Why it matters: Ark-share the two reusable gate patterns is open, local, and unblocked — can ship this session.

#### 4. [BRAND] Changelog publish
Final score: **78**
[PRODUCT/P1] Changelog publish — review context/changelog-drafts/2026-06-27.md and promote to changelog/index.html (founder voice).
Why it matters: Changelog publish affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 5. [VERIFY] E2E full verify
Final score: **71**
[CI/P2] E2E full verify — confirm E2E suite green post-LQIP fix (CI run needed).
Why it matters: E2E full verify is a 232-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [VERIFY] Verify Lighthouse homepage ≥0.80
Final score: **65**
[CI/P1] Verify Lighthouse homepage ≥0.80 — defer→idle (43KB) + outputDir fix (gate now sees LHR data). Watch next CI Lighthouse run.
Why it matters: Verify Lighthouse homepage ≥0.80 is a 232-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Verify E2E green
Final score: **62**
[CI/P1] Verify E2E green — networkidle mass-fix from S224. Confirm first green E2E run.
Why it matters: Verify E2E green is a 232-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [PRODUCT] workflow cache-dependency lint. Generalize check-workflow-install-con…
Final score: **60**
[INFRA/P3·SIL] workflow cache-dependency lint. Generalize check-workflow-install-consistency to flag any actions/setup-node cache: without a committed lockfile present (not just the literal cache: 'npm').
Why it matters: workflow cache-dependency lint. Generalize check-workflow-install-cons is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. INP slow-interaction consumer
2. Post-push CI confirmation
3. INP root-fix
4. Forge Window naming
5. Forge Window naming propagation
6. Generalize the blockDays trust-ceiling
7. Ark-share the two reusable gate patterns
8. Changelog publish
9. E2E full verify
10. Verify Lighthouse homepage ≥0.80
11. Verify E2E green
12. workflow cache-dependency lint. Generalize check-workflow-install-con…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
