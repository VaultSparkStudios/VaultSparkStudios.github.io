# Genius Hit List — Session 246

Generated: 2026-07-02
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **77/100**
- Health: **green**
- Current SIL: **999/500**
- CI health: **all-green ✓**
- Current focus: S246 /arc: external homepage audit fixes shipped; proof fallbacks/loading copy/mystery/legacy/nav collision corrected; homepage audit regression guard added; project schema generator wired into build; build/build:check/doctor green with blockingFailing 0.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Content-drift P1 cleanup
Final score: **93**
[CONTENT/P1] Content-drift P1 cleanup — improve Call of Doodie, Gridiron GM, and Velaxis page bodies against check-project-info-drift evidence.
Why it matters: Content-drift P1 cleanup is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Atlas registry freshness reconciliation
Final score: **90**
[OPS/P2] Atlas registry freshness reconciliation — advisory: public canonical atlas is not on the local registry/site mapping; resolve via the owning source or Ark.
Why it matters: Atlas registry freshness reconciliation is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] TASK_BOARD size strategy
Final score: **87**
[HYGIENE/P2] TASK_BOARD size strategy — rotate-taskboard --check-size warns at 297KB with no rotatable blocks; design a safe archival split before it becomes blocking.
Why it matters: TASK_BOARD size strategy is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Post-push CI/deploy confirmation for S246
Final score: **86**
[VERIFY/P1] Post-push CI/deploy confirmation for S246 — verify GitHub Pages, CI beacon, status-proof/build-sha refresh, and live homepage after the pushed commit.
Why it matters: Post-push CI/deploy confirmation for S246 is a 246-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [PRODUCT] INP root-fix when field data lands
Final score: **84**
[SIL][PERF/P1] INP root-fix when field data lands — implement only after route/handler/phase evidence exists.
Why it matters: INP root-fix when field data lands is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Arc profile slug mapping fix verification
Final score: **78**
[SIL][OPS/P1] Arc profile slug mapping fix verification — when Studio Ops processes cargo 01JSF8P1L4A5007257B4E63601, confirm VaultSparkStudios.github.io profiles as website/public-live/SPARKED.
Why it matters: Arc profile slug mapping fix verification is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Closeout brief behavioral fixture
Final score: **72**
[SIL][BRIEF/P2] Closeout brief behavioral fixture — add a small renderer fixture that proves linter rejection and archive write behavior, complementing the smoke import gate.
Why it matters: Closeout brief behavioral fixture is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Post-push CI/deploy confirmation for S245
Final score: **71**
[VERIFY/P1] Post-push CI/deploy confirmation for S245 — after push, verify GitHub Pages deployment, CI beacon, and public status-proof refresh on the pushed commit.
Why it matters: Post-push CI/deploy confirmation for S245 is a 246-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [PRODUCT] Status-proof proof text extension
Final score: **69**
[TRUST/P1] Status-proof proof text extension — consider surfacing the exact oldest feed/recovery hint in an agent-readable detail view without crowding homepage copy.
Why it matters: Status-proof proof text extension is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] Closeout brief renderer restore
Final score: **66**
[SIL][OPS/P1] Closeout brief renderer restore — restore or delegate scripts/render-closeout-brief.mjs so future closeouts can render the mandatory impact brief locally.
Why it matters: Closeout brief renderer restore is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Homepage synthetic Lighthouse floor
Final score: **65**
[PERF/P1] Homepage synthetic Lighthouse floor — investigate only when field/prod signals justify action; avoid single-runner tuning.
Why it matters: Homepage synthetic Lighthouse floor is a 246-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [COHESION] Provision verifier capability and bridge design
Final score: **65**
[OBELISK/P0] Provision verifier capability and bridge design — after OBELISK_VERIFY_SECRET/endpoint contract is available via secrets gateway, activate the positive verification path and design the Supabase JWT/RLS bridge.
Why it matters: Provision verifier capability and bridge design is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

## Recommended Build Order

1. Content-drift P1 cleanup
2. Atlas registry freshness reconciliation
3. TASK_BOARD size strategy
4. Post-push CI/deploy confirmation for S246
5. INP root-fix when field data lands
6. Arc profile slug mapping fix verification
7. Closeout brief behavioral fixture
8. Post-push CI/deploy confirmation for S245
9. Status-proof proof text extension
10. Closeout brief renderer restore
11. Homepage synthetic Lighthouse floor
12. Provision verifier capability and bridge design

## Best Immediate Move

CI is all-green. Focus on the top unblocked implementation item above, then rerun this generator after shipping.
