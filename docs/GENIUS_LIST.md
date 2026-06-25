# Genius Hit List — Session 223

Generated: 2026-06-25
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **976/500**
- CI health: **check gh run list**
- Current focus: S223 (full arc, 10 items) — (1) build-agents-json.mjs P0 degrade (2nd gitignored-input script after S222); (2) check-build-step-resilience gate (all 54 scripts, class un-reintroducible); (3) check-hero-jsonld-completeness; (4) VR baseline infra 3 bugs fixed (snapshotDir + waitUntil:load + always()); (5) Node 24 upgrade 9 workflows; (6) ci-health-monitor + sync-ci-health-issue; (7) check-workflow-yaml-validity; (8) Ark drain (33); (9) 70 VR Linux baselines committed (run 28200394502, 35 dark + 35 light); (10) findMissingSparkedShards — CANON-048 SPARKED on-site pages must have committed AI shard (11/11 self-test). build:check EXIT 0 + blockingFailing 0 verified directly.

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

#### 2. [PRODUCT] workflow cache-dependency lint. Generalize check-workflow-install-con…
Final score: **93**
[INFRA/P3·SIL] workflow cache-dependency lint. Generalize check-workflow-install-consistency to flag any actions/setup-node cache: without a committed lockfile present (not just the literal cache: 'npm').
Why it matters: workflow cache-dependency lint. Generalize check-workflow-install-cons is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] First real push notification
Final score: **87**
[PUSH/P1·FOUNDER] First real push notification — npm run push:count (0 subs today) → npm run push:notify -- --game cod (founder go-ahead required).
Why it matters: First real push notification is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] ci-health-monitor first real run
Final score: **86**
[INFRA/P3] ci-health-monitor first real run — monitor will run on schedule (9am UTC) and open/update a GitHub Issue if any dead crons are found. Watch for the first auto-issue or auto-close after the Refresh Live Data cron goes green.
Why it matters: ci-health-monitor first real run is a 223-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [BRAND] Draft one Signal Log post (founder voice) + publish forge devlog (fou…
Final score: **84**
[CONTENT/P1·FOUNDER] Draft one Signal Log post (founder voice) + publish forge devlog (founder voice, never auto-published).
Why it matters: Draft one Signal Log post (founder voice) + publish forge devlog (foun affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [PRODUCT] Provision ark.hmac.seed (fleet ARK_HMAC_SEED)
Final score: **81**
[CRED/P1·FOUNDER] Provision ark.hmac.seed (fleet ARK_HMAC_SEED) — fixes cross-repo Ark signature verification (52 sig-failures on drain). HMAC-seed minting = founder credential action (CANON-019 reserved).
Why it matters: Provision ark.hmac.seed (fleet ARK_HMAC_SEED) is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] scheduled-workflow staleness beacon. Record per-workflow last-conclus…
Final score: **80**
[INFRA/P3·SIL] scheduled-workflow staleness beacon. Record per-workflow last-conclusion in api/ci-status.json + a read-only local doctor probe that flags any *scheduled* workflow red for ≥2 runs — so a 3-month silent break (og-images) can't recur. (Top gap this session: CI-failure blindness.)
Why it matters: scheduled-workflow staleness beacon. Record per-workflow last-conclusi is a 223-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [BRAND] MOBILE-SHEET-DEFAULT-SWAP
Final score: **78**
[UX·FOUNDER] MOBILE-SHEET-DEFAULT-SWAP — founder real-device verification (flag-gated nav sheet).
Why it matters: MOBILE-SHEET-DEFAULT-SWAP affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### LATER

#### 1. [PRODUCT] card-accent → cover-image overlay tint
Final score: **75**
[UX/P3·SIL] card-accent → cover-image overlay tint — quality-deferred (CANON-047 AI-image-test needs a non-headless screenshot env).
Why it matters: card-accent is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Draft one Signal Log post from the brainstormed ideas (founder voice)…
Final score: **72**
[CONTENT/P1·FOUNDER] Draft one Signal Log post from the brainstormed ideas (founder voice) + publish forge devlog (founder voice, never auto-published).
Why it matters: Draft one Signal Log post from the brainstormed ideas (founder voice)  affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [PRODUCT] Sibling CANON-006 (velaxis/syntha/shadow missing branding) → ship Ark…
Final score: **69**
[OPS/P2] Sibling CANON-006 (velaxis/syntha/shadow missing branding) → ship Ark repo-question cargo to studio-ops; process pending Ark cargos (S213 01JRK6AH97E0F421A55C54236C, S216 01JRONES0VE96C6C4554516536 + 01JRONIRFF246105D9994172D4).
Why it matters: Sibling CANON-006 (velaxis/syntha/shadow missing branding) is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. Post-push CI confirmation
2. workflow cache-dependency lint. Generalize check-workflow-install-con…
3. First real push notification
4. ci-health-monitor first real run
5. Forge Window naming propagation
6. Draft one Signal Log post (founder voice) + publish forge devlog (fou…
7. Provision ark.hmac.seed (fleet ARK_HMAC_SEED)
8. scheduled-workflow staleness beacon. Record per-workflow last-conclus…
9. MOBILE-SHEET-DEFAULT-SWAP
10. card-accent → cover-image overlay tint
11. Draft one Signal Log post from the brainstormed ideas (founder voice)…
12. Sibling CANON-006 (velaxis/syntha/shadow missing branding) → ship Ark…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
