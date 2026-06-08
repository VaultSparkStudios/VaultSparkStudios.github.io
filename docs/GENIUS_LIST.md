# Genius Hit List — Session 180

Generated: 2026-06-08
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **84/100**
- Health: **green**
- Current SIL: **999/500**
- CI health: **check gh run list**
- Current focus: AI-discovery spine wave 2 shipped — /agents.json now appears in generated response headers and is gate-enforced; ambient-split wave 3 moved route/hook-scoped pathfinder + static Ask IGNIS engines behind predicates (feature bundle 45.4KB→35.2KB); build:check green

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] TT-ENFORCE-REPROBE. Now due (~2026-06-12): node scripts/probe-tt-soak…
Final score: **100**
[S180][SECURITY/P1] TT-ENFORCE-REPROBE. Now due (~2026-06-12): node scripts/probe-tt-soak.mjs && node scripts/analyze-tt-violations.mjs; S176 default-policy bridge should show near-zero new clusters → if clean, enforce-flip decision (founder device verify per SOUL #3).
Why it matters: TT-ENFORCE-REPROBE. Now due (~2026-06-12): shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [VERIFY] UPTIME-PUBLISH-VERIFY. Confirm the first commit-worthy uptime-probe.y…
Final score: **94**
[S180][OBS/P2] UPTIME-PUBLISH-VERIFY. Confirm the first commit-worthy uptime-probe.yml run committed api/uptime.json + a history row (Actions tab / git log --author=github-actions), and that /status/ shows a real availability %. First low-churn commit is the smoke test.
Why it matters: UPTIME-PUBLISH-VERIFY. Confirm the first commit-worthy uptime-probe.ym shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict…
Final score: **93**
[S180][PERF/P1] ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict still PENDING (≥5/side not yet accrued; signal −83%). Once it confirms, api/field-win.json flips hasConfirmed:true and the /status/ "Biggest measured win" tile auto-lights — confirm it renders, then celebrate or regress-hunt with lib/perf-forensics.mjs.
Why it matters: ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict  is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP…
Final score: **87**
[S180][OBS/P3] GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP confirms the origin-migration win globally as samples grow.
Why it matters: GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP  is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [VERIFY] vaultsparked-proof.js delete (evidence-complete) + nav-sheet device v…
Final score: **80**
[S180][FOUNDER] vaultsparked-proof.js delete (evidence-complete) + nav-sheet device verify.
Why it matters: vaultsparked-proof.js delete (evidence-complete) + nav-sheet device ve shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 4. [VERIFY] TT-ENFORCE-REPROBE. Soak clock restarted 2026-06-05 (env-fix) and S17…
Final score: **78**
[S177][SECURITY/P1] TT-ENFORCE-REPROBE. Soak clock restarted 2026-06-05 (env-fix) and S176 burned down the founder-named sinks via the default-policy bridge. Re-probe ~2026-06-12: node scripts/probe-tt-soak.mjs && node scripts/analyze-tt-violations.mjs; expect near-zero new clusters → if clean, enforce-flip decision (founder device verify per SOUL #3).
Why it matters: TT-ENFORCE-REPROBE. Soak clock restarted 2026-06-05 (env-fix) and S176 was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [PRODUCT] ORIGIN-MIGRATION-FIELD-VERDICT. / field verdict still PENDING (3 post…
Final score: **78**
[S177][PERF/P1] ORIGIN-MIGRATION-FIELD-VERDICT. / field verdict still PENDING (3 post-deploy samples). Once ≥5/side accrue, read data/field-verdicts.json — expect a real LCP drop from edge-origin TTFB. Celebrate or regress-hunt with lib/perf-forensics.mjs.
Why it matters: ORIGIN-MIGRATION-FIELD-VERDICT. / field verdict still PENDING (3 post- is open, local, and unblocked — can ship this session.

### LATER

#### 1. [VERIFY] UPTIME-PROBE-VERIFY. Confirm the first uptime-probe.yml scheduled run…
Final score: **72**
[S177][OBS/P2] UPTIME-PROBE-VERIFY. Confirm the first uptime-probe.yml scheduled run executed cleanly (Actions tab) and that a forced failure path emails correctly. First dispatch is the smoke test.
Why it matters: UPTIME-PROBE-VERIFY. Confirm the first uptime-probe.yml scheduled run  was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [PRODUCT] GEO-VITALS-WATCH. api/geo-vitals.json exists (US:107 GB:3); check whe…
Final score: **72**
[S177][OBS/P3] GEO-VITALS-WATCH. api/geo-vitals.json exists (US:107 GB:3); check whether non-US LCP confirms the origin-migration win globally once samples grow.
Why it matters: GEO-VITALS-WATCH. api/geo-vitals.json exists (US:107 GB:3); check whet is open, local, and unblocked — can ship this session.

#### 3. [SECURITY] TT-RE-PROBE-POST-ENV-FIX. The intake fix only went live late 2026-06-…
Final score: **72**
[S176][SECURITY/P1] TT-RE-PROBE-POST-ENV-FIX. The intake fix only went live late 2026-06-05 (env-target miss) — restart the soak clock from then; re-probe ~2026-06-12.
Why it matters: TT-RE-PROBE-POST-ENV-FIX. The intake fix only went live late 2026-06-0 lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

## Recommended Build Order

1. TT-ENFORCE-REPROBE. Now due (~2026-06-12): node scripts/probe-tt-soak…
2. Post-push CI confirmation
3. UPTIME-PUBLISH-VERIFY. Confirm the first commit-worthy uptime-probe.y…
4. ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP. / field verdict…
5. GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP…
6. Forge Window naming propagation
7. vaultsparked-proof.js delete (evidence-complete) + nav-sheet device v…
8. TT-ENFORCE-REPROBE. Soak clock restarted 2026-06-05 (env-fix) and S17…
9. ORIGIN-MIGRATION-FIELD-VERDICT. / field verdict still PENDING (3 post…
10. UPTIME-PROBE-VERIFY. Confirm the first uptime-probe.yml scheduled run…
11. GEO-VITALS-WATCH. api/geo-vitals.json exists (US:107 GB:3); check whe…
12. TT-RE-PROBE-POST-ENV-FIX. The intake fix only went live late 2026-06-…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
