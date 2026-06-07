# Genius Hit List — Session 175

Generated: 2026-06-07
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **86/100**
- Health: **green**
- Current SIL: **997/500**
- CI health: **check gh run list**
- Current focus: Origin on Cloudflare Pages + split shell + first-party analytics live; awaiting field verdict on the speed arc

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] TT-ENFORCE-REPROBE. Soak clock restarted 2026-06-05 (env-fix) and S17…
Final score: **100**
[S177][SECURITY/P1] TT-ENFORCE-REPROBE. Soak clock restarted 2026-06-05 (env-fix) and S176 burned down the founder-named sinks via the default-policy bridge. Re-probe ~2026-06-12: node scripts/probe-tt-soak.mjs && node scripts/analyze-tt-violations.mjs; expect near-zero new clusters → if clean, enforce-flip decision (founder device verify per SOUL #3).
Why it matters: TT-ENFORCE-REPROBE. Soak clock restarted 2026-06-05 (env-fix) and S176 shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [VERIFY] UPTIME-PROBE-VERIFY. Confirm the first uptime-probe.yml scheduled run…
Final score: **94**
[S177][OBS/P2] UPTIME-PROBE-VERIFY. Confirm the first uptime-probe.yml scheduled run executed cleanly (Actions tab) and that a forced failure path emails correctly. First dispatch is the smoke test.
Why it matters: UPTIME-PROBE-VERIFY. Confirm the first uptime-probe.yml scheduled run  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] ORIGIN-MIGRATION-FIELD-VERDICT. / field verdict still PENDING (3 post…
Final score: **93**
[S177][PERF/P1] ORIGIN-MIGRATION-FIELD-VERDICT. / field verdict still PENDING (3 post-deploy samples). Once ≥5/side accrue, read data/field-verdicts.json — expect a real LCP drop from edge-origin TTFB. Celebrate or regress-hunt with lib/perf-forensics.mjs.
Why it matters: ORIGIN-MIGRATION-FIELD-VERDICT. / field verdict still PENDING (3 post- is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] GEO-VITALS-WATCH. api/geo-vitals.json exists (US:107 GB:3); check whe…
Final score: **87**
[S177][OBS/P3] GEO-VITALS-WATCH. api/geo-vitals.json exists (US:107 GB:3); check whether non-US LCP confirms the origin-migration win globally once samples grow.
Why it matters: GEO-VITALS-WATCH. api/geo-vitals.json exists (US:107 GB:3); check whet is open, local, and unblocked — can ship this session.

#### 2. [SECURITY] TT-RE-PROBE-POST-ENV-FIX. The intake fix only went live late 2026-06-…
Final score: **87**
[S176][SECURITY/P1] TT-RE-PROBE-POST-ENV-FIX. The intake fix only went live late 2026-06-05 (env-target miss) — restart the soak clock from then; re-probe ~2026-06-12.
Why it matters: TT-RE-PROBE-POST-ENV-FIX. The intake fix only went live late 2026-06-0 lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 3. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 4. [PRODUCT] ORIGIN-MIGRATION-FIELD-VERDICT. The 2026-06-05 boundary now covers S1…
Final score: **84**
[S176][PERF/P1] ORIGIN-MIGRATION-FIELD-VERDICT. The 2026-06-05 boundary now covers S173 critical path + S175 origin migration. Read data/field-verdicts.json once ≥5 post-deploy samples accrue; expect a real LCP drop from edge-origin TTFB.
Why it matters: ORIGIN-MIGRATION-FIELD-VERDICT. The 2026-06-05 boundary now covers S17 is open, local, and unblocked — can ship this session.

#### 5. [VERIFY] FIELD-VERDICT-READOUT. rum-autopull-ci accrues nightly; once / has ≥5…
Final score: **79**
[S175][PERF/P1] FIELD-VERDICT-READOUT. rum-autopull-ci accrues nightly; once / has ≥5 post-deploy samples, data/field-verdicts.json grades the S173 homepage work. Read the verdict, then act (celebrate or regress-hunt with lib/perf-forensics.mjs).
Why it matters: FIELD-VERDICT-READOUT. rum-autopull-ci accrues nightly; once / has ≥5  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [PRODUCT] GEO-VITALS-WATCH. api/geo-vitals.json now exists; check whether non-U…
Final score: **78**
[S176][OBS/P3] GEO-VITALS-WATCH. api/geo-vitals.json now exists; check whether non-US LCP confirms the origin migration win globally.
Why it matters: GEO-VITALS-WATCH. api/geo-vitals.json now exists; check whether non-US is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] TT-SOAK-RE-PROBE. The S174 sink burndown needs ~1 week of 100%-sample…
Final score: **76**
[S175][SECURITY/P1] TT-SOAK-RE-PROBE. The S174 sink burndown needs ~1 week of 100%-sample soak to propagate. Run node scripts/probe-tt-soak.mjs + node scripts/analyze-tt-violations.mjs; expect near-zero new clusters. If clean → enforce-canary decision (founder device verify gate per SOUL #3).
Why it matters: TT-SOAK-RE-PROBE. The S174 sink burndown needs ~1 week of 100%-sample  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] RUM-AUTOPULL-VERIFY. Confirm the first scheduled rum-pull.yml run com…
Final score: **73**
[S175][DATA/P2] RUM-AUTOPULL-VERIFY. Confirm the first scheduled rum-pull.yml run committed field history (Actions tab or git log --author=github-actions). First dispatch after push is the smoke test.
Why it matters: RUM-AUTOPULL-VERIFY. Confirm the first scheduled rum-pull.yml run comm shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

## Recommended Build Order

1. TT-ENFORCE-REPROBE. Soak clock restarted 2026-06-05 (env-fix) and S17…
2. Post-push CI confirmation
3. UPTIME-PROBE-VERIFY. Confirm the first uptime-probe.yml scheduled run…
4. ORIGIN-MIGRATION-FIELD-VERDICT. / field verdict still PENDING (3 post…
5. GEO-VITALS-WATCH. api/geo-vitals.json exists (US:107 GB:3); check whe…
6. TT-RE-PROBE-POST-ENV-FIX. The intake fix only went live late 2026-06-…
7. Forge Window naming propagation
8. ORIGIN-MIGRATION-FIELD-VERDICT. The 2026-06-05 boundary now covers S1…
9. FIELD-VERDICT-READOUT. rum-autopull-ci accrues nightly; once / has ≥5…
10. GEO-VITALS-WATCH. api/geo-vitals.json now exists; check whether non-U…
11. TT-SOAK-RE-PROBE. The S174 sink burndown needs ~1 week of 100%-sample…
12. RUM-AUTOPULL-VERIFY. Confirm the first scheduled rum-pull.yml run com…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
