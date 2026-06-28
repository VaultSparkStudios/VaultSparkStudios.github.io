# Genius Hit List — Session 231

Generated: 2026-06-28
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **79/100**
- Health: **green**
- Current SIL: **991/500**
- CI health: **check gh run list**
- Current focus: S231 (arc) — root-fixed two silently-RED CI gates that 3 closeouts missed by never running `gh run list`. (1) E2E Test Suite compliance job failed on clean-stale-shells: a committed orphan shell (assets/ambient-core.shell-bff2141eb7.js, 0 tracked-HTML refs) was masked locally by gitignored lighthouse-results/*.html reports — removed the orphan + rewrote clean-stale-shells to scan git-tracked HTML only (git ls-files), killing the green-locally/red-in-CI class (same as S229 LQIP). (2) Lighthouse CI failed on the S229 trend-ledger git push (403/exit128, no permissions block) — added permissions: contents:write + push-only-on-main + rebase + continue-on-error. Generalized: same divergence fixed in check-orphan-assets (skip lighthouse-results/.lighthouseci); new check-trust-feed-freshness.mjs extends the S230 blockDays ceiling to status-proof/uptime/site-health/heartbeat feeds (dead-cron class blocks build); CI-truth beacon added to the startup brief (reads api/ci-status.json -> 'CI (main)' SIGNALS row, so a closeout can never again claim green over a red main). build:check passes my changes in-chain (proof-surface verified); the lone local failure is a pre-existing Windows-vs-Linux lqip-map base64 platform artifact (committed = CI-correct, kept).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 2. [PRODUCT] INP root-fix
Final score: **90**
[PERF/P1] INP root-fix — once inp-telemetry.js has 2–3 days of field data (0 inp:slow_interaction samples as of S231), fix the dominant slow interaction on /games/.
Why it matters: INP root-fix is open, local, and unblocked — can ship this session.

#### 3. [BRAND] Forge Window naming
Final score: **87**
[BRAND/FOUNDER] Forge Window naming — rename "Studio Pulse"→"Forge Window" across 108 public pages is a founder-gated public-vocabulary change (keep /studio-pulse/ URL for SEO). Needs sign-off on the public name.
Why it matters: Forge Window naming affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [VERIFY] Confirm CI flips GREEN on this push
Final score: **86**
[CI/P0·VERIFY] Confirm CI flips GREEN on this push — E2E Test Suite + Lighthouse CI must go green (the real arbiter; root causes fixed, verify on next run via gh run list).
Why it matters: Confirm CI flips GREEN on this push is a 231-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

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

#### 3. [VERIFY] LQIP cross-platform determinism
Final score: **83**
[INFRA/P2] LQIP cross-platform determinism — build-lqip-map base64 differs Windows↔Linux (libvips encode), so local build:check perpetually shows lqip stale after a Linux Action regen. Needs a platform-stable encode or a .gitattributes/CI-only-regen strategy. (Pre-existing; surfaced this session.)
Why it matters: LQIP cross-platform determinism is a 231-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [BRAND] Changelog publish
Final score: **78**
[PRODUCT/P1] Changelog publish — review context/changelog-drafts/2026-06-27.md and promote to changelog/index.html (founder voice).
Why it matters: Changelog publish affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 5. [VERIFY] E2E full verify
Final score: **71**
[CI/P2] E2E full verify — confirm E2E suite green post-LQIP fix (CI run needed).
Why it matters: E2E full verify is a 231-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [VERIFY] Verify Lighthouse homepage ≥0.80
Final score: **65**
[CI/P1] Verify Lighthouse homepage ≥0.80 — defer→idle (43KB) + outputDir fix (gate now sees LHR data). Watch next CI Lighthouse run.
Why it matters: Verify Lighthouse homepage ≥0.80 is a 231-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Verify E2E green
Final score: **62**
[CI/P1] Verify E2E green — networkidle mass-fix from S224. Confirm first green E2E run.
Why it matters: Verify E2E green is a 231-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [PRODUCT] workflow cache-dependency lint. Generalize check-workflow-install-con…
Final score: **60**
[INFRA/P3·SIL] workflow cache-dependency lint. Generalize check-workflow-install-consistency to flag any actions/setup-node cache: without a committed lockfile present (not just the literal cache: 'npm').
Why it matters: workflow cache-dependency lint. Generalize check-workflow-install-cons is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. Post-push CI confirmation
2. INP root-fix
3. Forge Window naming
4. Confirm CI flips GREEN on this push
5. Forge Window naming propagation
6. Generalize the blockDays trust-ceiling
7. LQIP cross-platform determinism
8. Changelog publish
9. E2E full verify
10. Verify Lighthouse homepage ≥0.80
11. Verify E2E green
12. workflow cache-dependency lint. Generalize check-workflow-install-con…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
