# Genius Hit List — Session 183

Generated: 2026-06-10
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **950/500**
- CI health: **check gh run list**
- Current focus: S183 ran the full S182 genius list (6 shipped) + resolved a founder P0: /oracle/ not refreshing (gitignored local-only feed 404ing on prod + a daily workflow that regenerated the public feed but never committed it) — Oracle now renders the deployed public-safe /api/public-intelligence.json, verified live. Edge-fn security fixes deployed (verify_jwt pinned in config first). build:check now GREEN end-to-end locally (Ark-dossier determinism fix). Worker unit tests + apex-HTML failure-shape probe shipped.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] UPTIME-PROBE-REBASE-BEFORE-PUSH. uptime-probe.yml (and likely other s…
Final score: **96**
[S183][P0/FOLLOW-UP] UPTIME-PROBE-REBASE-BEFORE-PUSH. uptime-probe.yml (and likely other self-committing scheduled workflows) push without git pull --rebase first, so they lose a race when a human/agent push lands in the same window (observed S183: one uptime-probe run failed on failed to push some refs). Add git pull --rebase --autostash before the push in the publish step. Self-heals each cycle but is avoidable noise.
Why it matters: UPTIME-PROBE-REBASE-BEFORE-PUSH. uptime-probe.yml (and likely other se is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [COHESION] STATUS-PROOF-INDEX. Merge AI discovery, uptime, field wins, staging, …
Final score: **89**
[S181→NEXT][PROOF/P2] STATUS-PROOF-INDEX. Merge AI discovery, uptime, field wins, staging, and public contracts into one public-safe /api/status-proof.json manifest so /status/ fetches one proof surface.
Why it matters: STATUS-PROOF-INDEX. Merge AI discovery, uptime, field wins, staging, a is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 4. [VERIFY] TT-ENFORCE-REPROBE. Due ~2026-06-12: node scripts/probe-tt-soak.mjs &…
Final score: **87**
[S180][SECURITY/P1] TT-ENFORCE-REPROBE. Due ~2026-06-12: node scripts/probe-tt-soak.mjs && node scripts/analyze-tt-violations.mjs; S176 default-policy bridge should show near-zero new clusters → if clean, enforce-flip decision (founder device verify per SOUL #3).
Why it matters: TT-ENFORCE-REPROBE. Due ~2026-06-12: was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [PRODUCT] ORIGIN-MIGRATION-FIELD-VERDICT. / field verdict still PENDING (≥5/sid…
Final score: **87**
[S180][PERF/P1] ORIGIN-MIGRATION-FIELD-VERDICT. / field verdict still PENDING (≥5/side not accrued; api/field-win.json hasConfirmed:false, no samples). Once it confirms, the /status/ "Biggest measured win" tile auto-lights — confirm it renders, then celebrate or regress-hunt.
Why it matters: ORIGIN-MIGRATION-FIELD-VERDICT. / field verdict still PENDING (≥5/side is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [BRAND] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
Final score: **81**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed via /api/public-intelligence.json, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only /ignis/output/*. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
Why it matters: RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed v affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [PRODUCT] GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP…
Final score: **81**
[S180][OBS/P3] GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP confirms the origin-migration win globally as samples grow.
Why it matters: GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP  is open, local, and unblocked — can ship this session.

#### 5. [VERIFY] TT-ENFORCE-REPROBE. Now due (~2026-06-12): node scripts/probe-tt-soak…
Final score: **72**
[S180][SECURITY/P1] TT-ENFORCE-REPROBE. Now due (~2026-06-12): node scripts/probe-tt-soak.mjs && node scripts/analyze-tt-violations.mjs; S176 default-policy bridge should show near-zero new clusters → if clean, enforce-flip decision (founder device verify per SOUL #3).
Why it matters: TT-ENFORCE-REPROBE. Now due (~2026-06-12): was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [PRODUCT] ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict…
Final score: **72**
[S180][PERF/P1] ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict still PENDING (≥5/side not yet accrued; signal −83%). Once it confirms, api/field-win.json flips hasConfirmed:true and the /status/ "Biggest measured win" tile auto-lights — confirm it renders, then celebrate or regress-hunt with lib/perf-forensics.mjs.
Why it matters: ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict  is open, local, and unblocked — can ship this session.

#### 2. [COHESION] STATUS-PROOF-INDEX. Consider merging AI discovery, uptime, field wins…
Final score: **71**
[S181→NEXT][PROOF/P2] STATUS-PROOF-INDEX. Consider merging AI discovery, uptime, field wins, staging, and public contracts into one public-safe /api/status-proof.json manifest so /status/ fetches one proof surface.
Why it matters: STATUS-PROOF-INDEX. Consider merging AI discovery, uptime, field wins, is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 3. [VERIFY] vaultsparked-proof.js delete (evidence-complete) + nav-sheet device v…
Final score: **67**
[S180][FOUNDER] vaultsparked-proof.js delete (evidence-complete) + nav-sheet device verify.
Why it matters: vaultsparked-proof.js delete (evidence-complete) + nav-sheet device ve was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

## Recommended Build Order

1. UPTIME-PROBE-REBASE-BEFORE-PUSH. uptime-probe.yml (and likely other s…
2. Post-push CI confirmation
3. STATUS-PROOF-INDEX. Merge AI discovery, uptime, field wins, staging, …
4. TT-ENFORCE-REPROBE. Due ~2026-06-12: node scripts/probe-tt-soak.mjs &…
5. ORIGIN-MIGRATION-FIELD-VERDICT. / field verdict still PENDING (≥5/sid…
6. Forge Window naming propagation
7. RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
8. GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP…
9. TT-ENFORCE-REPROBE. Now due (~2026-06-12): node scripts/probe-tt-soak…
10. ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict…
11. STATUS-PROOF-INDEX. Consider merging AI discovery, uptime, field wins…
12. vaultsparked-proof.js delete (evidence-complete) + nav-sheet device v…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
