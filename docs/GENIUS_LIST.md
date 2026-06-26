# Genius Hit List — Session 227

Generated: 2026-06-26
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **983/500**
- CI health: **check gh run list**
- Current focus: S227 (full arc) — IGNIS community topic chips (oracle-feedback-themes surface), session-context scoring boost, topic-aware returning-visitor re-entry chip, deploy-hash cache invalidation; Lighthouse CI blocking regression gate (outputDir + --check post-run); push notification GAME_COPY_VARIANTS personalization (cod/fgm/forge); sitemap auto-derivation gate (35 pages verified). LCP decoding=async fix: removed decoding=async from LCP img (was causing 5.1s render delay = 82% of LCP time). build:check EXIT 0 + blockingFailing 0.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [AI] IGNIS oracle:context_boost RUM
Final score: **97**
[AI/P2] IGNIS oracle:context_boost RUM — session-context boost is shipping but the RUM event oracle:context_boost was omitted (in-memory only). Add to Worker RUM_UX_EVENTS + emit in answer() scoring loop for measurement.
Why it matters: IGNIS oracle:context_boost RUM must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

#### 2. [SECURITY] CSP violation doctor probe
Final score: **96**
[SECURITY/P3] CSP violation doctor probe — only remaining gap: a check-csp-violations.mjs that reads a KV-serving Worker GET endpoint (not buildable without shipping a new Worker route). Deferred until Worker GET for csp-violations is available.
Why it matters: CSP violation doctor probe lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 3. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 4. [PRODUCT] Leaderboard sub-pages sitemap.xml
Final score: **87**
[SEO/P2] Leaderboard sub-pages sitemap.xml — the 7 new /leaderboards/*/ pages are not yet in sitemap.xml; add them for crawler indexing.
Why it matters: Leaderboard sub-pages sitemap.xml is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [VERIFY] Verify Lighthouse homepage ≥0.80
Final score: **86**
[CI/P1] Verify Lighthouse homepage ≥0.80 — decoding=async removed = 5.1s render delay eliminated. Watch next CI Lighthouse run (outputDir now set, --check gate will catch regression).
Why it matters: Verify Lighthouse homepage ≥0.80 is a 227-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [PRODUCT] workflow cache-dependency lint. Generalize check-workflow-install-con…
Final score: **78**
[INFRA/P3·SIL] workflow cache-dependency lint. Generalize check-workflow-install-consistency to flag any actions/setup-node cache: without a committed lockfile present (not just the literal cache: 'npm').
Why it matters: workflow cache-dependency lint. Generalize check-workflow-install-cons is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Verify E2E green in CI
Final score: **74**
[CI/P2] Verify E2E green in CI — the networkidle mass-fix should eliminate timeout failures in s134-oracle-ignis.spec.js and the 9 other files. Watch for the first green E2E run after S224 commit lands.
Why it matters: Verify E2E green in CI is a 227-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [PRODUCT] First real push notification
Final score: **72**
[PUSH/P1·FOUNDER] First real push notification — npm run push:count (0 subs today) → npm run push:notify -- --game cod (founder go-ahead required).
Why it matters: First real push notification is open, local, and unblocked — can ship this session.

### LATER

#### 1. [VERIFY] ci-health-monitor first real run
Final score: **71**
[INFRA/P3] ci-health-monitor first real run — monitor will run on schedule (9am UTC) and open/update a GitHub Issue if any dead crons are found. Watch for the first auto-issue or auto-close after the Refresh Live Data cron goes green.
Why it matters: ci-health-monitor first real run is a 227-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [BRAND] Draft one Signal Log post (founder voice) + publish forge devlog (fou…
Final score: **69**
[CONTENT/P1·FOUNDER] Draft one Signal Log post (founder voice) + publish forge devlog (founder voice, never auto-published).
Why it matters: Draft one Signal Log post (founder voice) + publish forge devlog (foun affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [PRODUCT] Provision ark.hmac.seed (fleet ARK_HMAC_SEED)
Final score: **66**
[CRED/P1·FOUNDER] Provision ark.hmac.seed (fleet ARK_HMAC_SEED) — fixes cross-repo Ark signature verification (52 sig-failures on drain). HMAC-seed minting = founder credential action (CANON-019 reserved).
Why it matters: Provision ark.hmac.seed (fleet ARK_HMAC_SEED) is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. IGNIS oracle:context_boost RUM
2. CSP violation doctor probe
3. Post-push CI confirmation
4. Leaderboard sub-pages sitemap.xml
5. Verify Lighthouse homepage ≥0.80
6. Forge Window naming propagation
7. workflow cache-dependency lint. Generalize check-workflow-install-con…
8. Verify E2E green in CI
9. First real push notification
10. ci-health-monitor first real run
11. Draft one Signal Log post (founder voice) + publish forge devlog (fou…
12. Provision ark.hmac.seed (fleet ARK_HMAC_SEED)

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
