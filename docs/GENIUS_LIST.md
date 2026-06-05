# Genius Hit List — Session 175

Generated: 2026-06-05
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **86/100**
- Health: **green**
- Current SIL: **995/500**
- CI health: **check gh run list**
- Current focus: Origin on Cloudflare Pages + split shell + first-party analytics live; awaiting field verdict on the speed arc

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [SECURITY] TT-RE-PROBE-POST-ENV-FIX. The intake fix only went live late 2026-06-…
Final score: **99**
[S176][SECURITY/P1] TT-RE-PROBE-POST-ENV-FIX. The intake fix only went live late 2026-06-05 (env-target miss) — restart the soak clock from then; re-probe ~2026-06-12.
Why it matters: TT-RE-PROBE-POST-ENV-FIX. The intake fix only went live late 2026-06-0 lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 2. [PRODUCT] ORIGIN-MIGRATION-FIELD-VERDICT. The 2026-06-05 boundary now covers S1…
Final score: **96**
[S176][PERF/P1] ORIGIN-MIGRATION-FIELD-VERDICT. The 2026-06-05 boundary now covers S173 critical path + S175 origin migration. Read data/field-verdicts.json once ≥5 post-deploy samples accrue; expect a real LCP drop from edge-origin TTFB.
Why it matters: ORIGIN-MIGRATION-FIELD-VERDICT. The 2026-06-05 boundary now covers S17 is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 4. [VERIFY] FIELD-VERDICT-READOUT. rum-autopull-ci accrues nightly; once / has ≥5…
Final score: **91**
[S175][PERF/P1] FIELD-VERDICT-READOUT. rum-autopull-ci accrues nightly; once / has ≥5 post-deploy samples, data/field-verdicts.json grades the S173 homepage work. Read the verdict, then act (celebrate or regress-hunt with lib/perf-forensics.mjs).
Why it matters: FIELD-VERDICT-READOUT. rum-autopull-ci accrues nightly; once / has ≥5  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [PRODUCT] GEO-VITALS-WATCH. api/geo-vitals.json now exists; check whether non-U…
Final score: **90**
[S176][OBS/P3] GEO-VITALS-WATCH. api/geo-vitals.json now exists; check whether non-US LCP confirms the origin migration win globally.
Why it matters: GEO-VITALS-WATCH. api/geo-vitals.json now exists; check whether non-US is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] TT-SOAK-RE-PROBE. The S174 sink burndown needs ~1 week of 100%-sample…
Final score: **88**
[S175][SECURITY/P1] TT-SOAK-RE-PROBE. The S174 sink burndown needs ~1 week of 100%-sample soak to propagate. Run node scripts/probe-tt-soak.mjs + node scripts/analyze-tt-violations.mjs; expect near-zero new clusters. If clean → enforce-canary decision (founder device verify gate per SOUL #3).
Why it matters: TT-SOAK-RE-PROBE. The S174 sink burndown needs ~1 week of 100%-sample  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 4. [VERIFY] RUM-AUTOPULL-VERIFY. Confirm the first scheduled rum-pull.yml run com…
Final score: **85**
[S175][DATA/P2] RUM-AUTOPULL-VERIFY. Confirm the first scheduled rum-pull.yml run committed field history (Actions tab or git log --author=github-actions). First dispatch after push is the smoke test.
Why it matters: RUM-AUTOPULL-VERIFY. Confirm the first scheduled rum-pull.yml run comm shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [BRAND] NAV-SHEET-25PCT-WATCH. With the canary at 25%, check-nav-sheet-canary…
Final score: **78**
[S175][UX/P2] NAV-SHEET-25PCT-WATCH. With the canary at 25%, check-nav-sheet-canary.mjs should flip from telemetry-silent within 1-2 weeks of mobile traffic. Re-run at /start.
Why it matters: NAV-SHEET-25PCT-WATCH. With the canary at 25%, check-nav-sheet-canary. affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### LATER

#### 1. [PRODUCT] ARK-REPLY-CHECK. Drain inbox for studio-ops reply to cargo 01JQARTIQ4…
Final score: **75**
[S175][ECOSYSTEM/P3] ARK-REPLY-CHECK. Drain inbox for studio-ops reply to cargo 01JQARTIQ4F428A7E440BFE7D6 (sig failures + try_files patch).
Why it matters: ARK-REPLY-CHECK. Drain inbox for studio-ops reply to cargo 01JQARTIQ4F is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] MEMBERSHIP-PROOF-LOOP-DEVICE-VERIFY. Founder-gated: verify the interv…
Final score: **74**
[S174][UX/P2] MEMBERSHIP-PROOF-LOOP-DEVICE-VERIFY. Founder-gated: verify the interview → rank-economy proof loop on a real mobile device.
Why it matters: MEMBERSHIP-PROOF-LOOP-DEVICE-VERIFY. Founder-gated: verify the intervi shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 3. [PRODUCT] Delete assets/vaultsparked-proof.js? (30-second yes/no). Evidence-com…
Final score: **69**
Delete assets/vaultsparked-proof.js? (30-second yes/no). Evidence-complete: superseded by live-proof.js which writes the same IDs + more; not loaded anywhere. Current founder-facing decision doc: docs/MEMBERSHIP_ORPHAN_DECISION.md.
Why it matters: Delete assets/vaultsparked-proof.js? (30-second yes/no). Evidence-comp is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. TT-RE-PROBE-POST-ENV-FIX. The intake fix only went live late 2026-06-…
2. ORIGIN-MIGRATION-FIELD-VERDICT. The 2026-06-05 boundary now covers S1…
3. Post-push CI confirmation
4. FIELD-VERDICT-READOUT. rum-autopull-ci accrues nightly; once / has ≥5…
5. GEO-VITALS-WATCH. api/geo-vitals.json now exists; check whether non-U…
6. TT-SOAK-RE-PROBE. The S174 sink burndown needs ~1 week of 100%-sample…
7. Forge Window naming propagation
8. RUM-AUTOPULL-VERIFY. Confirm the first scheduled rum-pull.yml run com…
9. NAV-SHEET-25PCT-WATCH. With the canary at 25%, check-nav-sheet-canary…
10. ARK-REPLY-CHECK. Drain inbox for studio-ops reply to cargo 01JQARTIQ4…
11. MEMBERSHIP-PROOF-LOOP-DEVICE-VERIFY. Founder-gated: verify the interv…
12. Delete assets/vaultsparked-proof.js? (30-second yes/no). Evidence-com…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
