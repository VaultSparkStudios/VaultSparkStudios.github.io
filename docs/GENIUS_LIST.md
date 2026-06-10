# Genius Hit List — Session 183

Generated: 2026-06-10
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **green**
- Current SIL: **950/500**
- CI health: **check gh run list**
- Current focus: S184 shipped 6/6 audit items + root-caused the [skip ci]-tip CF Pages deploy-strand (confirmed field-win + status-proof manifest now deploy on this push)

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [SECURITY] TT-ENFORCE-REPROBE
Final score: **99**
[S180→S184][SECURITY/P1] TT-ENFORCE-REPROBE — REPROBED S184, verdict AMBER. Ran probe + analyzer 2026-06-10: 148 violations/30d still present (not the clean GREEN a flip needs). Top sinks: journal/dispatches:364 (×30, recurring), home-idle-loader.js:16, football-gm appCore.js (cross-repo), schema-injector.js:23, ambient.shell. Burn-down plan + flip command in docs/TT_ENFORCE_READINESS_2026-06-10.md. Flip stays founder-device gated (SOUL #3). Carry stays OPEN — next step is named-policy migration of the 4 first-party sinks + an Ark cargo to football-gm.
Why it matters: TT-ENFORCE-REPROBE lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP…
Final score: **90**
[S180][OBS/P3] GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP confirms the origin-migration win globally as samples grow.
Why it matters: GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP  is open, local, and unblocked — can ship this session.

#### 4. [SECURITY] TT-NAMED-POLICY-WAVE. Migrate the 4 first-party TT sinks (home-idle-l…
Final score: **90**
[S184][SECURITY/P2] TT-NAMED-POLICY-WAVE. Migrate the 4 first-party TT sinks (home-idle-loader.js:16, schema-injector.js:23, ambient.shell:337/367) off the default catch-all policy to named Trusted-Types policies, then reprobe toward a clean GREEN enforce-flip. Ship football-gm appCore.js sinks as Ark cargo (CANON-018). See docs/TT_ENFORCE_READINESS_2026-06-10.md.
Why it matters: TT-NAMED-POLICY-WAVE. Migrate the 4 first-party TT sinks (home-idle-lo lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [BRAND] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
Final score: **84**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed via /api/public-intelligence.json, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only /ignis/output/*. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
Why it matters: RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed v affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [PRODUCT] STATUS-PROOF-IN-AGENTS-JSON. Cross-link /api/status-proof.json from /…
Final score: **81**
[S184][AI/P3] STATUS-PROOF-IN-AGENTS-JSON. Cross-link /api/status-proof.json from /agents.json + /.well-known/llms.txt so agents discover the single-fetch trust manifest without scraping /status/.
Why it matters: STATUS-PROOF-IN-AGENTS-JSON. Cross-link /api/status-proof.json from /a is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] ARK-DEPLOY-STRAND-PATTERN-SHARE. Broadcast the [skip ci]-tip CF-Pages…
Final score: **79**
[S184][ECOSYSTEM/P1] ARK-DEPLOY-STRAND-PATTERN-SHARE. Broadcast the [skip ci]-tip CF-Pages deploy-strand finding + scripts/check-deploy-tip.mjs guard to all CF-Pages sibling repos via Ark pattern-share — likely a fleet-wide silent bug. (node scripts/ark.mjs ship --type pattern-share --to '*' ...)
Why it matters: ARK-DEPLOY-STRAND-PATTERN-SHARE. Broadcast the [skip ci]-tip CF-Pages  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

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

1. TT-ENFORCE-REPROBE
2. Post-push CI confirmation
3. GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP…
4. TT-NAMED-POLICY-WAVE. Migrate the 4 first-party TT sinks (home-idle-l…
5. Forge Window naming propagation
6. RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
7. STATUS-PROOF-IN-AGENTS-JSON. Cross-link /api/status-proof.json from /…
8. ARK-DEPLOY-STRAND-PATTERN-SHARE. Broadcast the [skip ci]-tip CF-Pages…
9. TT-ENFORCE-REPROBE. Now due (~2026-06-12): node scripts/probe-tt-soak…
10. ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict…
11. STATUS-PROOF-INDEX. Consider merging AI discovery, uptime, field wins…
12. vaultsparked-proof.js delete (evidence-complete) + nav-sheet device v…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
