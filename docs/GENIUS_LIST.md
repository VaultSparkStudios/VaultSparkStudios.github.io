# Genius Hit List — Session 222

Generated: 2026-06-25
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **972/500**
- CI health: **check gh run list**
- Current focus: S222 (arc) — closed the CI-failure-blindness class. Built check-scheduled-workflow-staleness.mjs (S221 brainstorm #1) + wired it into the doctor; on first run it caught a real incident: Refresh Live Data cron red 7 consecutive runs. Root-fixed the true cause (past a red-herring Ark-dossier log): build-llms-full-shards.mjs hard-exit(1) on the gitignored ignis/output/ecosystem-state.json, which is always absent on CI → stranded the whole 4h data-refresh → now degrades gracefully (warn+exit0). Also: fixed visual-regression defaultBrowserType-in-describe error + chromium-pinned the workflow; completed the half-done S185 rename by migrating the /studio-pulse/ H1 Forge Window→Studio Pulse + smoke assertion (E2E unblock, honoring binding D-S221.5); hardened check-s151-contracts to body-scan (closes the gate-gap that hid the stale H1); generalized cache-lint to npm/yarn/pnpm (S221 brainstorm #2). Closed 2 duplicate phantom TASK_BOARD entries. build:check EXIT 0 + blockingFailing 0 verified directly.

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
Final score: **90**
[INFRA/P3·SIL] workflow cache-dependency lint. Generalize check-workflow-install-consistency to flag any actions/setup-node cache: without a committed lockfile present (not just the literal cache: 'npm').
Why it matters: workflow cache-dependency lint. Generalize check-workflow-install-cons is open, local, and unblocked — can ship this session.

#### 3. [INTELLIGENCE] build-step resilience audit
Final score: **87**
[INFRA/P3·SIL] build-step resilience audit — scan npm run build's chain for other steps that process.exit(1) guarded only by existsSync(<gitignored path>) (the llms-shards class), before they strand a cron. The staleness beacon is the safety net until then.
Why it matters: build-step resilience audit keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 4. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

### NEXT

#### 1. [PRODUCT] First real push notification
Final score: **84**
[PUSH/P1·FOUNDER] First real push notification — npm run push:count (0 subs today) → npm run push:notify -- --game cod (founder go-ahead required).
Why it matters: First real push notification is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] visual-regression Linux baseline capture
Final score: **83**
[CI/P2·SIL] visual-regression Linux baseline capture — now that collection is fixed + chromium-pinned, run the documented workflow_dispatch post-deploy to self-capture Ubuntu baselines, download the artifact, commit under tests/__snapshots__/ so the gate finally compares against committed truth (there are currently 0 committed snapshots).
Why it matters: visual-regression Linux baseline capture is a 222-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [BRAND] Draft one Signal Log post (founder voice) + publish forge devlog (fou…
Final score: **81**
[CONTENT/P1·FOUNDER] Draft one Signal Log post (founder voice) + publish forge devlog (founder voice, never auto-published).
Why it matters: Draft one Signal Log post (founder voice) + publish forge devlog (foun affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [PRODUCT] Provision ark.hmac.seed (fleet ARK_HMAC_SEED)
Final score: **78**
[CRED/P1·FOUNDER] Provision ark.hmac.seed (fleet ARK_HMAC_SEED) — fixes cross-repo Ark signature verification (52 sig-failures on drain). HMAC-seed minting = founder credential action (CANON-019 reserved).
Why it matters: Provision ark.hmac.seed (fleet ARK_HMAC_SEED) is open, local, and unblocked — can ship this session.

#### 5. [VERIFY] scheduled-workflow staleness beacon. Record per-workflow last-conclus…
Final score: **77**
[INFRA/P3·SIL] scheduled-workflow staleness beacon. Record per-workflow last-conclusion in api/ci-status.json + a read-only local doctor probe that flags any *scheduled* workflow red for ≥2 runs — so a 3-month silent break (og-images) can't recur. (Top gap this session: CI-failure blindness.)
Why it matters: scheduled-workflow staleness beacon. Record per-workflow last-conclusi is a 222-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [BRAND] MOBILE-SHEET-DEFAULT-SWAP
Final score: **75**
[UX·FOUNDER] MOBILE-SHEET-DEFAULT-SWAP — founder real-device verification (flag-gated nav sheet).
Why it matters: MOBILE-SHEET-DEFAULT-SWAP affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [PRODUCT] card-accent → cover-image overlay tint
Final score: **72**
[UX/P3·SIL] card-accent → cover-image overlay tint — quality-deferred (CANON-047 AI-image-test needs a non-headless screenshot env).
Why it matters: card-accent is open, local, and unblocked — can ship this session.

#### 3. [BRAND] Draft one Signal Log post from the brainstormed ideas (founder voice)…
Final score: **69**
[CONTENT/P1·FOUNDER] Draft one Signal Log post from the brainstormed ideas (founder voice) + publish forge devlog (founder voice, never auto-published).
Why it matters: Draft one Signal Log post from the brainstormed ideas (founder voice)  affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

## Recommended Build Order

1. Post-push CI confirmation
2. workflow cache-dependency lint. Generalize check-workflow-install-con…
3. build-step resilience audit
4. Forge Window naming propagation
5. First real push notification
6. visual-regression Linux baseline capture
7. Draft one Signal Log post (founder voice) + publish forge devlog (fou…
8. Provision ark.hmac.seed (fleet ARK_HMAC_SEED)
9. scheduled-workflow staleness beacon. Record per-workflow last-conclus…
10. MOBILE-SHEET-DEFAULT-SWAP
11. card-accent → cover-image overlay tint
12. Draft one Signal Log post from the brainstormed ideas (founder voice)…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
