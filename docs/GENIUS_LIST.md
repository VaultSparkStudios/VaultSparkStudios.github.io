# Genius Hit List — Session 228

Generated: 2026-06-27
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **79/100**
- Health: **green**
- Current SIL: **987/500**
- CI health: **check gh run list**
- Current focus: S228 (arc continuation) — oracle:context_boost RUM (S227 carry, now measured); CSP violations probe + Worker /v/csp-violations-summary GET endpoint (S227 brainstorm, CANON-051 monitoring closed); defer→idle migration (trust-depth/related-content/pathways-router + adaptive-cta removed from homepage — 43KB DOMContentLoaded reduction); Lighthouse CI outputDir fix (treosh/lighthouse-ci-action@v11 outputDir unsupported — LHR files now copied from .lighthouseci/ to lighthouse-results/ before trend check); agents.json discovery link sitewide via propagate-nav.mjs (106 pages, CANON-048 closed). build:check EXIT 0 + blockingFailing 0.

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

#### 2. [VERIFY] Verify Lighthouse homepage ≥0.80
Final score: **86**
[CI/P1] Verify Lighthouse homepage ≥0.80 — defer→idle (43KB) + outputDir fix (gate now sees LHR data). Watch next CI Lighthouse run.
Why it matters: Verify Lighthouse homepage ≥0.80 is a 228-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 4. [VERIFY] Verify E2E green
Final score: **83**
[CI/P1] Verify E2E green — networkidle mass-fix from S224. Confirm first green E2E run.
Why it matters: Verify E2E green is a 228-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [PRODUCT] workflow cache-dependency lint. Generalize check-workflow-install-con…
Final score: **81**
[INFRA/P3·SIL] workflow cache-dependency lint. Generalize check-workflow-install-consistency to flag any actions/setup-node cache: without a committed lockfile present (not just the literal cache: 'npm').
Why it matters: workflow cache-dependency lint. Generalize check-workflow-install-cons is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Lighthouse trend auto-update in CI
Final score: **80**
[INFRA/P3] Lighthouse trend auto-update in CI — push updated .cache/lighthouse-trend.json back to repo after each CI Lighthouse run (CI step + PAT). Ledger currently only grows locally; cross-session trend is invisible in CI.
Why it matters: Lighthouse trend auto-update in CI is a 228-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] Verify E2E green in CI
Final score: **77**
[CI/P2] Verify E2E green in CI — the networkidle mass-fix should eliminate timeout failures in s134-oracle-ignis.spec.js and the 9 other files. Watch for the first green E2E run after S224 commit lands.
Why it matters: Verify E2E green in CI is a 228-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] First real push notification
Final score: **75**
[PUSH/P1·FOUNDER] First real push notification — npm run push:count (0 subs today) → npm run push:notify -- --game cod (founder go-ahead required).
Why it matters: First real push notification is open, local, and unblocked — can ship this session.

#### 5. [VERIFY] ci-health-monitor first real run
Final score: **74**
[INFRA/P3] ci-health-monitor first real run — monitor will run on schedule (9am UTC) and open/update a GitHub Issue if any dead crons are found. Watch for the first auto-issue or auto-close after the Refresh Live Data cron goes green.
Why it matters: ci-health-monitor first real run is a 228-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [BRAND] Draft one Signal Log post (founder voice) + publish forge devlog (fou…
Final score: **72**
[CONTENT/P1·FOUNDER] Draft one Signal Log post (founder voice) + publish forge devlog (founder voice, never auto-published).
Why it matters: Draft one Signal Log post (founder voice) + publish forge devlog (foun affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [PRODUCT] Provision ark.hmac.seed (fleet ARK_HMAC_SEED)
Final score: **69**
[CRED/P1·FOUNDER] Provision ark.hmac.seed (fleet ARK_HMAC_SEED) — fixes cross-repo Ark signature verification (52 sig-failures on drain). HMAC-seed minting = founder credential action (CANON-019 reserved).
Why it matters: Provision ark.hmac.seed (fleet ARK_HMAC_SEED) is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] scheduled-workflow staleness beacon. Record per-workflow last-conclus…
Final score: **68**
[INFRA/P3·SIL] scheduled-workflow staleness beacon. Record per-workflow last-conclusion in api/ci-status.json + a read-only local doctor probe that flags any *scheduled* workflow red for ≥2 runs — so a 3-month silent break (og-images) can't recur. (Top gap this session: CI-failure blindness.)
Why it matters: scheduled-workflow staleness beacon. Record per-workflow last-conclusi is a 228-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

## Recommended Build Order

1. Post-push CI confirmation
2. Verify Lighthouse homepage ≥0.80
3. Forge Window naming propagation
4. Verify E2E green
5. workflow cache-dependency lint. Generalize check-workflow-install-con…
6. Lighthouse trend auto-update in CI
7. Verify E2E green in CI
8. First real push notification
9. ci-health-monitor first real run
10. Draft one Signal Log post (founder voice) + publish forge devlog (fou…
11. Provision ark.hmac.seed (fleet ARK_HMAC_SEED)
12. scheduled-workflow staleness beacon. Record per-workflow last-conclus…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
