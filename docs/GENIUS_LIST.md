# Genius Hit List — Session 230

Generated: 2026-06-27
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **79/100**
- Health: **green**
- Current SIL: **990/500**
- CI health: **check gh run list**
- Current focus: S230 (arc) — public changelog 75-day gap CLOSED: two hand-curated visitor-voice entries added to changelog/index.html (S225–S229 + consolidated S67–S224 'Intelligence Era'), reporting only already-live features (the Oracle AI, web push, edge migration, living-portfolio homepage, game quiz, themes, Studio Pulse); page had been frozen at S66/2026-04-13 for 75 days. Freshness self-heal: draft-changelog-entry.mjs gained internal/visitor classifier + CANON-030 humanize lexicon + paste-ready cl-phase HTML emit; check-content-freshness.mjs gained a HARD blockDays:60 ceiling so a months-stale public changelog now BLOCKS build:check (exit 1, control-proven). Observability honesty: check-rum-allowlist parseEmissions now credits the raw event:'name' sendBeacon body (S229 inp-telemetry.js), killing a false 'dead config' warning (77→78 call-sites in sync). build:check EXIT 0 (verified directly).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Generalize the blockDays trust-ceiling
Final score: **96**
[INFRA/P2] Generalize the blockDays trust-ceiling — extend the expire-don't-warn blocking pattern to other public-trust surfaces that currently only warn (status-proof feeds, uptime publish age). One blocking ceiling per visitor-noticeable surface.
Why it matters: Generalize the blockDays trust-ceiling is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] INP root-fix
Final score: **93**
[PERF/P1] INP root-fix — once inp-telemetry.js has 2–3 days of field data, fix the dominant slow interaction on /games/ (INP 224ms).
Why it matters: INP root-fix is open, local, and unblocked — can ship this session.

#### 4. [BRAND] Changelog publish
Final score: **87**
[PRODUCT/P1] Changelog publish — review context/changelog-drafts/2026-06-27.md and promote to changelog/index.html (founder voice).
Why it matters: Changelog publish affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [VERIFY] E2E full verify
Final score: **80**
[CI/P2] E2E full verify — confirm E2E suite green post-LQIP fix (CI run needed).
Why it matters: E2E full verify is a 230-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] Verify Lighthouse homepage ≥0.80
Final score: **74**
[CI/P1] Verify Lighthouse homepage ≥0.80 — defer→idle (43KB) + outputDir fix (gate now sees LHR data). Watch next CI Lighthouse run.
Why it matters: Verify Lighthouse homepage ≥0.80 is a 230-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [VERIFY] Verify E2E green
Final score: **71**
[CI/P1] Verify E2E green — networkidle mass-fix from S224. Confirm first green E2E run.
Why it matters: Verify E2E green is a 230-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [PRODUCT] workflow cache-dependency lint. Generalize check-workflow-install-con…
Final score: **69**
[INFRA/P3·SIL] workflow cache-dependency lint. Generalize check-workflow-install-consistency to flag any actions/setup-node cache: without a committed lockfile present (not just the literal cache: 'npm').
Why it matters: workflow cache-dependency lint. Generalize check-workflow-install-cons is open, local, and unblocked — can ship this session.

### LATER

#### 1. [VERIFY] Lighthouse trend auto-update in CI
Final score: **68**
[INFRA/P3] Lighthouse trend auto-update in CI — push updated .cache/lighthouse-trend.json back to repo after each CI Lighthouse run (CI step + PAT). Ledger currently only grows locally; cross-session trend is invisible in CI.
Why it matters: Lighthouse trend auto-update in CI is a 230-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Verify E2E green in CI
Final score: **65**
[CI/P2] Verify E2E green in CI — the networkidle mass-fix should eliminate timeout failures in s134-oracle-ignis.spec.js and the 9 other files. Watch for the first green E2E run after S224 commit lands.
Why it matters: Verify E2E green in CI is a 230-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [PRODUCT] First real push notification
Final score: **63**
[PUSH/P1·FOUNDER] First real push notification — npm run push:count (0 subs today) → npm run push:notify -- --game cod (founder go-ahead required).
Why it matters: First real push notification is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. Generalize the blockDays trust-ceiling
2. Post-push CI confirmation
3. INP root-fix
4. Changelog publish
5. Forge Window naming propagation
6. E2E full verify
7. Verify Lighthouse homepage ≥0.80
8. Verify E2E green
9. workflow cache-dependency lint. Generalize check-workflow-install-con…
10. Lighthouse trend auto-update in CI
11. Verify E2E green in CI
12. First real push notification

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
