# Genius Hit List — Session 226

Generated: 2026-06-26
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **80/100**
- Health: **green**
- Current SIL: **986/500**
- CI health: **check gh run list**
- Current focus: S226 (arc continuation) — hero LCP root-fix: CSS image-set() background on featured tile cannot be matched by Chrome preload hints; converted to <picture><img fetchpriority="high"> (preload-matchable, discovered at HTML parse time). New check-hero-lcp-element blocking gate prevents regression. check-lighthouse-trend enhanced with RAW_METRICS (lcp_ms/fcp_ms/tbt_ms/cls). build:check EXIT 0 + blockingFailing 0 + smoke 26/27.

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

#### 2. [PRODUCT] Leaderboard sub-pages sitemap.xml
Final score: **90**
[SEO/P2] Leaderboard sub-pages sitemap.xml — the 7 new /leaderboards/*/ pages are not yet in sitemap.xml. Add 7 <url> entries (or derive programmatically from PAGES array in build-leaderboard-subpages.mjs).
Why it matters: Leaderboard sub-pages sitemap.xml is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Verify Lighthouse homepage ≥0.80
Final score: **86**
[CI/P1] Verify Lighthouse homepage ≥0.80 — picture/img fix eliminates the CSS-background preload-mismatch root cause. Watch next CI Lighthouse run. If still failing, investigate TBT as remaining bottleneck.
Why it matters: Verify Lighthouse homepage ≥0.80 is a 226-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

### NEXT

#### 1. [VERIFY] Lighthouse CI gate: --check flag for perf threshold
Final score: **83**
[INFRA/P2] Lighthouse CI gate: --check flag for perf threshold — after confirming ≥0.80, add check-lighthouse-trend --check --session N step to the Lighthouse CI workflow post-run. Makes perf regression ≥0.05 from best blocking in CI (not just advisory local).
Why it matters: Lighthouse CI gate: --check flag for perf threshold is a 226-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [PRODUCT] workflow cache-dependency lint. Generalize check-workflow-install-con…
Final score: **81**
[INFRA/P3·SIL] workflow cache-dependency lint. Generalize check-workflow-install-consistency to flag any actions/setup-node cache: without a committed lockfile present (not just the literal cache: 'npm').
Why it matters: workflow cache-dependency lint. Generalize check-workflow-install-cons is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Verify E2E green in CI
Final score: **77**
[CI/P2] Verify E2E green in CI — the networkidle mass-fix should eliminate timeout failures in s134-oracle-ignis.spec.js and the 9 other files. Watch for the first green E2E run after S224 commit lands.
Why it matters: Verify E2E green in CI is a 226-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] First real push notification
Final score: **75**
[PUSH/P1·FOUNDER] First real push notification — npm run push:count (0 subs today) → npm run push:notify -- --game cod (founder go-ahead required).
Why it matters: First real push notification is open, local, and unblocked — can ship this session.

#### 5. [VERIFY] ci-health-monitor first real run
Final score: **74**
[INFRA/P3] ci-health-monitor first real run — monitor will run on schedule (9am UTC) and open/update a GitHub Issue if any dead crons are found. Watch for the first auto-issue or auto-close after the Refresh Live Data cron goes green.
Why it matters: ci-health-monitor first real run is a 226-session-old carry-forward; verify or close it so it stops polluting the hit list.

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
Why it matters: scheduled-workflow staleness beacon. Record per-workflow last-conclusi is a 226-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

## Recommended Build Order

1. Post-push CI confirmation
2. Leaderboard sub-pages sitemap.xml
3. Verify Lighthouse homepage ≥0.80
4. Forge Window naming propagation
5. Lighthouse CI gate: --check flag for perf threshold
6. workflow cache-dependency lint. Generalize check-workflow-install-con…
7. Verify E2E green in CI
8. First real push notification
9. ci-health-monitor first real run
10. Draft one Signal Log post (founder voice) + publish forge devlog (fou…
11. Provision ark.hmac.seed (fleet ARK_HMAC_SEED)
12. scheduled-workflow staleness beacon. Record per-workflow last-conclus…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
