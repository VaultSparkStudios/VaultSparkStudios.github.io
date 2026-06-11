# Genius Hit List — Session 185

Generated: 2026-06-11
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **83/100**
- Health: **green**
- Current SIL: **943/500**
- CI health: **check gh run list**
- Current focus: S185 closeout complete — 11/12 items shipped: studio-pulse rename, IGNIS query cache, oracle-query-learning-loop, oracle proactive hints, vault-kinesis waveform, TT named-policy wave, ambient-split wave4, geo-vitals colo probe. Durable closeout fixes: step3d.7 artifact ordering, propagate-nav inline→class, oracle schemaVersion.

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

#### 3. [SECURITY] TT-ENFORCE-REPROBE. home-idle-loader.js:16 + schema-injector.js:23 + …
Final score: **93**
[S185][SECURITY/P1] TT-ENFORCE-REPROBE. home-idle-loader.js:16 + schema-injector.js:23 + ambient.shell still use default policy. Named-policy wave done (S185); remaining: those 2 first-party sinks + Ark cargo to football-gm for appCore.js sinks. Then reprobe for flip. Founder-device gated (SOUL #3).
Why it matters: TT-ENFORCE-REPROBE. home-idle-loader.js:16 + schema-injector.js:23 + a lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 4. [PRODUCT] GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP…
Final score: **90**
[S180][OBS/P3] GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP confirms the origin-migration win globally as samples grow.
Why it matters: GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP  is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [AI] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder call needed.
Final score: **88**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder call needed.
Why it matters: RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder call needed. must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [BRAND] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
Final score: **84**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed via /api/public-intelligence.json, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only /ignis/output/*. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
Why it matters: RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed v affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [PRODUCT] GEO-VITALS-WATCH. Colo probe added (S185 wave4c); trigger in GH Actio…
Final score: **81**
[S180][OBS/P3] GEO-VITALS-WATCH. Colo probe added (S185 wave4c); trigger in GH Actions workflow still needed.
Why it matters: GEO-VITALS-WATCH. Colo probe added (S185 wave4c); trigger in GH Action is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h, Wave 5). Next session.
Final score: **78**
[S185][UX/P1] PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h, Wave 5). Next session.
Why it matters: PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h, Wave 5). Next session. is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] GEO-VITALS-COLO-PROBE-WORKFLOW. Wire probe-uptime.mjs --colo-probe in…
Final score: **75**
[S185][OBS/P2] GEO-VITALS-COLO-PROBE-WORKFLOW. Wire probe-uptime.mjs --colo-probe into uptime-probe.yml GH Actions workflow (wave4c shipped the probe code; workflow trigger still pending).
Why it matters: GEO-VITALS-COLO-PROBE-WORKFLOW. Wire probe-uptime.mjs --colo-probe int is open, local, and unblocked — can ship this session.

#### 2. [BRAND] IGNIS-HINT-CONVERSION-TRACKING. Oracle proactive hints fire but click…
Final score: **69**
[SIL] IGNIS-HINT-CONVERSION-TRACKING. Oracle proactive hints fire but clicks are unmeasured; add vs:ux event on hint-shown/dismissed mirroring nav-sheet telemetry pattern. First step: dispatchEvent(new CustomEvent('vs:ux', {detail:{type:'ignis-hint',action:'shown'},bubbles:true})) in showHint().
Why it matters: IGNIS-HINT-CONVERSION-TRACKING. Oracle proactive hints fire but clicks affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [PRODUCT] ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict…
Final score: **60**
[S180][PERF/P1] ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict still PENDING (≥5/side not yet accrued; signal −83%). Once it confirms, api/field-win.json flips hasConfirmed:true and the /status/ "Biggest measured win" tile auto-lights — confirm it renders, then celebrate or regress-hunt with lib/perf-forensics.mjs.
Why it matters: ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict  is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. TT-ENFORCE-REPROBE
2. Post-push CI confirmation
3. TT-ENFORCE-REPROBE. home-idle-loader.js:16 + schema-injector.js:23 + …
4. GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP…
5. RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder call needed.
6. Forge Window naming propagation
7. RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
8. GEO-VITALS-WATCH. Colo probe added (S185 wave4c); trigger in GH Actio…
9. PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h, Wave 5). Next session.
10. GEO-VITALS-COLO-PROBE-WORKFLOW. Wire probe-uptime.mjs --colo-probe in…
11. IGNIS-HINT-CONVERSION-TRACKING. Oracle proactive hints fire but click…
12. ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
