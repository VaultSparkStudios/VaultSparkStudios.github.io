# Genius Hit List — Session 172

Generated: 2026-06-03
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **84/100**
- Health: **green**
- Current SIL: **994/500**
- CI health: **check gh run list**
- Current focus: Session 172 ran the full /start → /audit → /implement → /closeout goal-chain and shipped 12/12 audit items (Priority 281.0). Headline: the production RUM export labeled Founder-action since S163 was a CANON-019 phantom blocker — cloudflare.r2 was READY; scripts/fetch-rum-from-r2.mjs pulled 110 production rows on first run and npm run rum:pull now chains the field pipeline. TT soak made real (100% sampling/30d TTL, Worker deployed 4f7dd69c) and the first soak read exposed + fixed the cookie-consent innerHTML sink. Ark transport restored via delegation shim (3 cargo drained, oldest 164h). Membership orphan P1 diagnosed to one founder yes/no. Verification: build + build:check green end-to-end (118 pages); Worker live-verified.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] HOMEPAGE-FIELD-LCP-FIX. Field truth supersedes the artifact theory: /…
Final score: **96**
[S173][PERF/P1] HOMEPAGE-FIELD-LCP-FIX. Field truth supersedes the artifact theory: / median LCP ~5.8s, raw p75 ~10s across 37 real visits (FCP≈LCP, TTFB p75 1.3s). Diagnose render path for real-visitor conditions (cold cache + 4g). Forensics says infra/cache-state class — start with shell-hash rotation cadence + ambient bundle cold cost. Evidence: data/rum-summary.json + DECISIONS 2026-06-03.
Why it matters: HOMEPAGE-FIELD-LCP-FIX. Field truth supersedes the artifact theory: /  is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [VERIFY] TT-SOAK-REPROBE. ~1 week after 2026-06-03: node scripts/probe-tt-soak…
Final score: **94**
[S173][SECURITY/P2] TT-SOAK-REPROBE. ~1 week after 2026-06-03: node scripts/probe-tt-soak.mjs — with 100% sampling + cookie-consent fix live, expect near-0 violations; then founder device verify → enforce /privacy/ only.
Why it matters: TT-SOAK-REPROBE. ~1 week after 2026-06-03: shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 4. [PRODUCT] RUM-ACCRUAL-WATCH. Run npm run rum:pull each session; at ≥50 / sample…
Final score: **93**
[S173][DATA/P2] RUM-ACCRUAL-WATCH. Run npm run rum:pull each session; at ≥50 / samples flip check-perf-budget --source=rum --strict + log DECISIONS (resolves RUM-STRICT-FLIP + ABSOLUTE-LCP-ORIGIN-CEILING).
Why it matters: RUM-ACCRUAL-WATCH. Run is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] LONGTAIL-VISUAL-PROOF-REVIEW. Founder review
Final score: **87**
[S172][UX/P2] LONGTAIL-VISUAL-PROOF-REVIEW. Founder review — now one click: open docs/visual-proof/index.html. Promote the primitive rhythm to more long-tail surfaces if it reads well.
Why it matters: LONGTAIL-VISUAL-PROOF-REVIEW. Founder review is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [PRODUCT] Delete assets/vaultsparked-proof.js? (30-second yes/no). Evidence-com…
Final score: **84**
Delete assets/vaultsparked-proof.js? (30-second yes/no). Evidence-complete: superseded by live-proof.js which writes the same IDs + more; not loaded anywhere. Dossier: docs/MEMBERSHIP_ORPHAN_DOSSIER_S172.md §3.
Why it matters: Delete assets/vaultsparked-proof.js? (30-second yes/no). Evidence-comp is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] EDGE-PERSONALIZATION-READINESS. Resume docs/OBELISK_EDGE_PERSONALIZAT…
Final score: **78**
[S168][OBELISK/P1] EDGE-PERSONALIZATION-READINESS. Resume docs/OBELISK_EDGE_PERSONALIZATION_PLAN.md only after Obelisk Phase 2 declares stable session cookie/capability shape.
Why it matters: EDGE-PERSONALIZATION-READINESS. Resume docs/OBELISK_EDGE_PERSONALIZATI is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] When data/rum-summary.json shows ≥50 samples on /, flip check-perf-bu…
Final score: **75**
[S164→RUM-STRICT-FLIP] When data/rum-summary.json shows ≥50 samples on /, flip check-perf-budget.mjs --source=rum to --strict in build:check + log DECISIONS. The loop is wired (S163); waiting on field data to accumulate in R2. Resolves ABSOLUTE-LCP-ORIGIN-CEILING + the synthetic-trace saga.
Why it matters: When data/rum-summary.json shows ≥50 samples on /, flip check-perf-bud is open, local, and unblocked — can ship this session.

### LATER

#### 1. [INTELLIGENCE] RUM-ANOMALY-CANARY
Final score: **75**
[S164][AI/P2] RUM-ANOMALY-CANARY — week-over-week field-LCP anomaly signal (audit #10). Depends on RUM-STRICT-FLIP + ~1 week of samples. Extend pull-rum-summary.mjs with weekly snapshot deltas.
Why it matters: RUM-ANOMALY-CANARY keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 2. [INTELLIGENCE] TRUSTED-TYPES-ENFORCE-CANARY (audit #2)
Final score: **72**
[S164][SECURITY/P2] TRUSTED-TYPES-ENFORCE-CANARY (audit #2) — DEFERRED (evidence). CANON-019 preflight: cloudflare.kv MISSING → can't read the tt: soak. Enforce-without-soak + no real-device verify risks breaking the route (SOUL #3). Needs: KV soak read (cloudflare.kv cred or CF dashboard) confirming ~0 violations, then device verify, then enforce /privacy/ only.
Why it matters: TRUSTED-TYPES-ENFORCE-CANARY (audit #2) keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 3. [VERIFY] Verify membership interview on a real device. /membership/ → "Take 30…
Final score: **71**
Verify membership interview on a real device. /membership/ → "Take 30-second interview" affordance should render (re-wired S172); confirm IGNIS onboarding-interview budget cap still active.
Why it matters: Verify membership interview on a real device. /membership/ is a 172-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

## Recommended Build Order

1. HOMEPAGE-FIELD-LCP-FIX. Field truth supersedes the artifact theory: /…
2. Post-push CI confirmation
3. TT-SOAK-REPROBE. ~1 week after 2026-06-03: node scripts/probe-tt-soak…
4. RUM-ACCRUAL-WATCH. Run npm run rum:pull each session; at ≥50 / sample…
5. LONGTAIL-VISUAL-PROOF-REVIEW. Founder review
6. Forge Window naming propagation
7. Delete assets/vaultsparked-proof.js? (30-second yes/no). Evidence-com…
8. EDGE-PERSONALIZATION-READINESS. Resume docs/OBELISK_EDGE_PERSONALIZAT…
9. When data/rum-summary.json shows ≥50 samples on /, flip check-perf-bu…
10. RUM-ANOMALY-CANARY
11. TRUSTED-TYPES-ENFORCE-CANARY (audit #2)
12. Verify membership interview on a real device. /membership/ → "Take 30…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
