# Genius Hit List — Session 234

Generated: 2026-06-29
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **993/500**
- CI health: **check gh run list**
- Current focus: S234 (full /audit→/implement arc) — full-website redundancy+freshness pass found 233 sessions of per-surface gates had let 4 visitor-facing truths drift cross-surface: wrong Obelisk auth-return domain (vaultspark.studio≠canonical, broke login on both entry points), retired sealed:7 vocab, gold-vs-blue tier-theme contradiction, 277-day-stale 393 days-since-launch. Shipped the truth pass (all 4 fixed at source) + content-drift sentinel (check-content-coherence.mjs gates the whole cross-surface drift CLASS, 10/10 self-test, blocking in check-proof-surface) + diff-scoped gate runner (gate-scope.mjs, per-session token cut, full sweep in CI) + agent-UA edge policy (Worker stops hard-blocking curl/wget/requests/go-http on public reads, CANON-048) + agents.json feed catalog (9 feeds) + canonical api/membership-tiers.json. 10 ships/3 waves; 2 rejected/deferred with evidence. Commits 2b4a4c73/a2f4f24e/dc38300a.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [AI] Oracle prebake Answer API
Final score: **100**
[AI/P1] Oracle prebake Answer API — batched Haiku per deploy → committed answer corpus + agent-callable endpoint (real RAG, zero runtime cost, GEO/AEO win). Flagship deferred item.
Why it matters: Oracle prebake Answer API must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Tier-value calculator on /membership-value/ (foundation api/membershi…
Final score: **93**
[ENGAGEMENT/P2] Tier-value calculator on /membership-value/ (foundation api/membership-tiers.json shipped) + render the 3 membership pages from it (kills theme/perk drift at the root).
Why it matters: Tier-value calculator on /membership-value/ (foundation api/membership is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Worker deploy
Final score: **90**
[INFRA] Worker deploy — agent-UA policy + auth-domain fixes are in the static site; deploy the Worker change.
Why it matters: Worker deploy is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] INP root-fix
Final score: **87**
[SIL][PERF/P1] INP root-fix — once the enriched telemetry (S232 target+phase enrichment + S233 Worker fix) returns its first inp:slow_interaction sample, use data/inp-breakdown.json dominantPhase to fix the dominant slow interaction on /games/ (field 224ms, over 200ms budget).
Why it matters: INP root-fix is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [BRAND] Forge Window naming
Final score: **84**
[BRAND/FOUNDER] Forge Window naming — rename "Studio Pulse"→"Forge Window" across 108 public pages is a founder-gated public-vocabulary change (keep /studio-pulse/ URL for SEO). Needs sign-off on the public name.
Why it matters: Forge Window naming affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [PRODUCT] Generalize the blockDays trust-ceiling
Final score: **81**
[INFRA/P2] Generalize the blockDays trust-ceiling — extend the expire-don't-warn blocking pattern to other public-trust surfaces that currently only warn (status-proof feeds, uptime publish age). One blocking ceiling per visitor-noticeable surface.
Why it matters: Generalize the blockDays trust-ceiling is open, local, and unblocked — can ship this session.

#### 5. [BRAND] Changelog publish
Final score: **75**
[PRODUCT/P1] Changelog publish — review context/changelog-drafts/2026-06-27.md and promote to changelog/index.html (founder voice).
Why it matters: Changelog publish affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### LATER

#### 1. [VERIFY] E2E full verify
Final score: **68**
[CI/P2] E2E full verify — confirm E2E suite green post-LQIP fix (CI run needed).
Why it matters: E2E full verify is a 234-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Verify Lighthouse homepage ≥0.80
Final score: **62**
[CI/P1] Verify Lighthouse homepage ≥0.80 — defer→idle (43KB) + outputDir fix (gate now sees LHR data). Watch next CI Lighthouse run.
Why it matters: Verify Lighthouse homepage ≥0.80 is a 234-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] Verify E2E green
Final score: **59**
[CI/P1] Verify E2E green — networkidle mass-fix from S224. Confirm first green E2E run.
Why it matters: Verify E2E green is a 234-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

## Recommended Build Order

1. Oracle prebake Answer API
2. Post-push CI confirmation
3. Tier-value calculator on /membership-value/ (foundation api/membershi…
4. Worker deploy
5. INP root-fix
6. Forge Window naming propagation
7. Forge Window naming
8. Generalize the blockDays trust-ceiling
9. Changelog publish
10. E2E full verify
11. Verify Lighthouse homepage ≥0.80
12. Verify E2E green

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
