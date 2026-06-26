# Genius Hit List — Session 224

Generated: 2026-06-26
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **79/100**
- Health: **green**
- Current SIL: **983/500**
- CI health: **check gh run list**
- Current focus: S224 (full arc, 11 items + 3 second-order) — networkidle mass-fix session: 10 E2E test files (23 instances) replaced with 'load' + targeted waitForTimeout; check-e2e-networkidle gate gates the class; accessibility test hardened with page.evaluate() snapshot; generate-push-config CI fix (sibling repo absent on CI); local-preview-server _headers Cloudflare fidelity; resilience gate throw detection; RUM allowlist sw.js scan; ci-status-beacon scheduled workflow tracking (hasDeadCron). build:check EXIT 0 + blockingFailing 0 verified directly.

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

#### 2. [VERIFY] Verify E2E green in CI
Final score: **86**
[CI/P2] Verify E2E green in CI — the networkidle mass-fix should eliminate timeout failures in s134-oracle-ignis.spec.js and the 9 other files. Watch for the first green E2E run after S224 commit lands.
Why it matters: Verify E2E green in CI is a 224-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 4. [PRODUCT] workflow cache-dependency lint. Generalize check-workflow-install-con…
Final score: **84**
[INFRA/P3·SIL] workflow cache-dependency lint. Generalize check-workflow-install-consistency to flag any actions/setup-node cache: without a committed lockfile present (not just the literal cache: 'npm').
Why it matters: workflow cache-dependency lint. Generalize check-workflow-install-cons is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [VERIFY] ci-status-beacon hasDeadCron dashboard surface
Final score: **80**
[INFRA/P3·SIL] ci-status-beacon hasDeadCron dashboard surface — api/ci-status.json now has hasDeadCron and scheduledWorkflows[]. Build a tiny check-ci-status-dead-crons.mjs gate that reads the beacon and fails (advisory) if any scheduled workflow has dead: true. Closes the local observability gap (the beacon is already emitting the data; a gate makes it actionable without GitHub).
Why it matters: ci-status-beacon hasDeadCron dashboard surface is a 224-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [PRODUCT] First real push notification
Final score: **78**
[PUSH/P1·FOUNDER] First real push notification — npm run push:count (0 subs today) → npm run push:notify -- --game cod (founder go-ahead required).
Why it matters: First real push notification is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] ci-health-monitor first real run
Final score: **77**
[INFRA/P3] ci-health-monitor first real run — monitor will run on schedule (9am UTC) and open/update a GitHub Issue if any dead crons are found. Watch for the first auto-issue or auto-close after the Refresh Live Data cron goes green.
Why it matters: ci-health-monitor first real run is a 224-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [BRAND] Draft one Signal Log post (founder voice) + publish forge devlog (fou…
Final score: **75**
[CONTENT/P1·FOUNDER] Draft one Signal Log post (founder voice) + publish forge devlog (founder voice, never auto-published).
Why it matters: Draft one Signal Log post (founder voice) + publish forge devlog (foun affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 5. [PRODUCT] Provision ark.hmac.seed (fleet ARK_HMAC_SEED)
Final score: **72**
[CRED/P1·FOUNDER] Provision ark.hmac.seed (fleet ARK_HMAC_SEED) — fixes cross-repo Ark signature verification (52 sig-failures on drain). HMAC-seed minting = founder credential action (CANON-019 reserved).
Why it matters: Provision ark.hmac.seed (fleet ARK_HMAC_SEED) is open, local, and unblocked — can ship this session.

### LATER

#### 1. [VERIFY] check-playwright-locator-all gate
Final score: **71**
[INFRA/P3·SIL] check-playwright-locator-all gate — page.locator().all() followed by async getAttribute() is a latent race condition on any page with dynamic DOM. Scan test specs for .all() followed by .getAttribute()/.textContent() in a for-of loop; flag with a fix suggestion. Extends the S224 accessibility hardening.
Why it matters: check-playwright-locator-all gate is a 224-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] scheduled-workflow staleness beacon. Record per-workflow last-conclus…
Final score: **71**
[INFRA/P3·SIL] scheduled-workflow staleness beacon. Record per-workflow last-conclusion in api/ci-status.json + a read-only local doctor probe that flags any *scheduled* workflow red for ≥2 runs — so a 3-month silent break (og-images) can't recur. (Top gap this session: CI-failure blindness.)
Why it matters: scheduled-workflow staleness beacon. Record per-workflow last-conclusi is a 224-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [BRAND] MOBILE-SHEET-DEFAULT-SWAP
Final score: **69**
[UX·FOUNDER] MOBILE-SHEET-DEFAULT-SWAP — founder real-device verification (flag-gated nav sheet).
Why it matters: MOBILE-SHEET-DEFAULT-SWAP affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

## Recommended Build Order

1. Post-push CI confirmation
2. Verify E2E green in CI
3. Forge Window naming propagation
4. workflow cache-dependency lint. Generalize check-workflow-install-con…
5. ci-status-beacon hasDeadCron dashboard surface
6. First real push notification
7. ci-health-monitor first real run
8. Draft one Signal Log post (founder voice) + publish forge devlog (fou…
9. Provision ark.hmac.seed (fleet ARK_HMAC_SEED)
10. check-playwright-locator-all gate
11. scheduled-workflow staleness beacon. Record per-workflow last-conclus…
12. MOBILE-SHEET-DEFAULT-SWAP

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
