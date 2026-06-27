# Genius Hit List — Session 229

Generated: 2026-06-27
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **79/100**
- Health: **green**
- Current SIL: **989/500**
- CI health: **check gh run list**
- Current focus: S229 (arc) — LQIP cross-platform P0 fix (build-lqip-map.mjs git ls-files → 201 deterministic entries on both platforms, closes E2E compliance CI gate); INP attribution telemetry (new assets/inp-telemetry.js — PerformanceObserver('event') >150ms → beacons inp:slow_interaction with element+type+duration to /v/rum); CWV composite pass rate (cwvPass per route + cwvPassRate global in rum-summary.mjs — field: 50%, / passes, /games/ fails INP 224ms); oracle domain-tag context ranking (+0.12 boost per shared URL path segment from prior sessionQueries in ignis-answer-engine.js); changelog auto-draft (new scripts/draft-changelog-entry.mjs → context/changelog-drafts/<date>.md, honest-dark); build-SHA pre-push refresh (closeout-autopilot Step 5b runs generate-build-sha.mjs before git add -A); push personalization + post-quiz CTA (wireQuizPrompt via vs:quiz-complete CustomEvent from game-discovery-quiz.js); Lighthouse staging warmup (curl warmup step in lighthouse.yml); Lighthouse trend CI pushback (auto-commit .cache/lighthouse-trend.json on each LH CI run via GITHUB_TOKEN); CLS hardening (contain-intrinsic-block-size on .member-welcome-strip). Worker deployed v4967045f. build:check EXIT 0.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [BRAND] INP root-fix
Final score: **96**
[PERF/P1] INP root-fix — after inp-telemetry.js collects 2–3 days of data, identify the dominant interaction and fix it (likely a heavy event listener on a nav element or oracle chip).
Why it matters: INP root-fix affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [BRAND] Changelog publish
Final score: **93**
[PRODUCT/P1] Changelog publish — review context/changelog-drafts/2026-06-27.md and promote to changelog/index.html (founder voice).
Why it matters: Changelog publish affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

### NEXT

#### 1. [VERIFY] E2E full verify
Final score: **80**
[CI/P2] E2E full verify — confirm E2E suite green post-LQIP fix (CI run needed).
Why it matters: E2E full verify is a 229-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Verify Lighthouse homepage ≥0.80
Final score: **77**
[CI/P1] Verify Lighthouse homepage ≥0.80 — defer→idle (43KB) + outputDir fix (gate now sees LHR data). Watch next CI Lighthouse run.
Why it matters: Verify Lighthouse homepage ≥0.80 is a 229-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] Verify E2E green
Final score: **74**
[CI/P1] Verify E2E green — networkidle mass-fix from S224. Confirm first green E2E run.
Why it matters: Verify E2E green is a 229-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] workflow cache-dependency lint. Generalize check-workflow-install-con…
Final score: **72**
[INFRA/P3·SIL] workflow cache-dependency lint. Generalize check-workflow-install-consistency to flag any actions/setup-node cache: without a committed lockfile present (not just the literal cache: 'npm').
Why it matters: workflow cache-dependency lint. Generalize check-workflow-install-cons is open, local, and unblocked — can ship this session.

#### 5. [VERIFY] Lighthouse trend auto-update in CI
Final score: **71**
[INFRA/P3] Lighthouse trend auto-update in CI — push updated .cache/lighthouse-trend.json back to repo after each CI Lighthouse run (CI step + PAT). Ledger currently only grows locally; cross-session trend is invisible in CI.
Why it matters: Lighthouse trend auto-update in CI is a 229-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [VERIFY] Verify E2E green in CI
Final score: **68**
[CI/P2] Verify E2E green in CI — the networkidle mass-fix should eliminate timeout failures in s134-oracle-ignis.spec.js and the 9 other files. Watch for the first green E2E run after S224 commit lands.
Why it matters: Verify E2E green in CI is a 229-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [PRODUCT] First real push notification
Final score: **66**
[PUSH/P1·FOUNDER] First real push notification — npm run push:count (0 subs today) → npm run push:notify -- --game cod (founder go-ahead required).
Why it matters: First real push notification is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] ci-health-monitor first real run
Final score: **65**
[INFRA/P3] ci-health-monitor first real run — monitor will run on schedule (9am UTC) and open/update a GitHub Issue if any dead crons are found. Watch for the first auto-issue or auto-close after the Refresh Live Data cron goes green.
Why it matters: ci-health-monitor first real run is a 229-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

## Recommended Build Order

1. INP root-fix
2. Post-push CI confirmation
3. Changelog publish
4. Forge Window naming propagation
5. E2E full verify
6. Verify Lighthouse homepage ≥0.80
7. Verify E2E green
8. workflow cache-dependency lint. Generalize check-workflow-install-con…
9. Lighthouse trend auto-update in CI
10. Verify E2E green in CI
11. First real push notification
12. ci-health-monitor first real run

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
