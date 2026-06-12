# Genius Hit List — Session 191

Generated: 2026-06-12
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **84/100**
- Health: **green**
- Current SIL: **956/500**
- CI health: **check gh run list**
- Current focus: S191 goal-chain (/start -> /audit -> /implement -> /closeout): complete the proof surface + harden its honesty. 4 shipped / 1 deferred-with-evidence, gates green for all changes. reduced-motion-animation-guard (WCAG 2.3.3 on honest-traction-scoreboard + vault-rank-bar), structured-citation-endpoint (api/citation.json via build-citation.mjs 9/9; agents.json + llms.txt discovery; CANON-008 license; honest-dark claims), trust-manifest-seed-rot-guard (build-public-status.mjs 9/9 replaces a rotting 2026-05-22 hand-seed; status-proof seed-rot WARN flagged staging-health 92% + security-posture 54%), funnel-proof-in-manifest (funnel-summary folded into status-proof as honestDarkOk feed). Deferred: oracle-per-cluster-feedback (Worker RUM_UX_EVENTS exact-match would drop dynamic keys; needs bounded prefix-rule first).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Confirm S192 features on prod after deploy. Verify via pages.dev orig…
Final score: **100**
[S192][VERIFY/P1] Confirm S192 features on prod after deploy. Verify via pages.dev origin (never assume push==deploy): (a) /api/security-posture.json shows generatedBy: scripts/build-security-posture.mjs (not manual-seed) + asOf today + 6/6 verified controls each with an evidence link; (b) /api/staging-health.json shows a fresh generatedAt + honest status (staging-unreachable until the Hetzner box is back) — no longer the 2026-06-05 stale green; (c) /api/status-proof.json summary.seedRisk is []; (d) /api/ci-status.json carries generatedBy; (e) a per-cluster oracle-answer:helpful:<id> beacon survives the edge (POST /v/rum with a bounded suffix → stored; an over-length/illegal suffix → dropped).
Why it matters: Confirm S192 features on prod after deploy. Verify via pages.dev origi shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] STAGING BOX RECOVERY. The --refresh probe confirmed website.staging.v…
Final score: **93**
[S192→][OBS/P2] STAGING BOX RECOVERY. The --refresh probe confirmed website.staging.vaultsparkstudios.com (Hetzner) is genuinely DOWN — staging-health will honestly read staging-unreachable until it's restored. CANON-007 wants a live staging env; bring the box back (or document its intended state) so parity flips green again. Agent-attemptable via hcloud/SSH capability — preflight before labeling founder.
Why it matters: STAGING BOX RECOVERY. The --refresh probe confirmed website.staging.va is open, local, and unblocked — can ship this session.

#### 4. [SECURITY] TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; p…
Final score: **93**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; pre-S185 samples aging out. Flip stays SOUL #3 founder-device gated.
Why it matters: TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; pr lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

### NEXT

#### 1. [BRAND] Review + publish the forge devlog draft. Re-run node scripts/draft-we…
Final score: **90**
[S189][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. Re-run node scripts/draft-weekly-forge.mjs for SOUL-voice output, then founder reviews + publishes to journal/ to clear the 82d-stale journal warn-gate.
Why it matters: Review + publish the forge devlog draft. Re-run affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [PRODUCT] PROOF-FEED-GENERATOR-GATE
Final score: **84**
[SIL][P3] PROOF-FEED-GENERATOR-GATE — extend coverage. The new check-proof-feed-generators.mjs guards the 10 status-proof feeds. As new public /api/*.json feeds are added, add them to build-status-proof.mjs FEEDS so they inherit the no-hand-seed guarantee. The gate also WARNs on a workflow-emitted feed whose generator path doesn't resolve — keep those honest.
Why it matters: PROOF-FEED-GENERATOR-GATE is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form…
Final score: **78**
[S188][VERIFY/P0] Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form renders + submits on a NON-home page (e.g. /faq/, /games/call-of-doodie/) — a real test subscriber lands via Kit; (b) Discord + Community Hub show in the Studio nav dropdown sitewide; (c) proof-line:{shown,click} + studio-dispatch:subscribe + play-next:* land in /v/rum; (d) call-of-doodie hero promise line renders. Verify via pages.dev origin + a prod path — never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]). Shell hash rotated this session → confirm cold-cache load is healthy.
Why it matters: Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form  was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **78**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then).
Why it matters: Review + publish the forge devlog draft. journal/_drafts/forge-week-20 affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### LATER

#### 1. [BRAND] RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently …
Final score: **75**
[S188][SIL] RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently passes with the nav-sheet: dynamic prefix covering its 4 entries. If a future RUM name is added to the Worker but never emitted, the gate WARNs (dead config) — periodically clear dead entries so the allowlist stays an honest map of live instrumentation.
Why it matters: RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently p affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [BRAND] FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail p…
Final score: **69**
[S187][UX/P2] FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail pages (narrative hero + screenshot + single CTA + voice copy). 4h; next session.
Why it matters: FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail pa affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [SECURITY] TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm…
Final score: **69**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm appCore.js baton + pre-S185 samples to age out. Reprobe ~2026-06-18; flip stays SOUL #3 founder-device gated.
Why it matters: TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm  lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

## Recommended Build Order

1. Confirm S192 features on prod after deploy. Verify via pages.dev orig…
2. Post-push CI confirmation
3. STAGING BOX RECOVERY. The --refresh probe confirmed website.staging.v…
4. TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; p…
5. Review + publish the forge devlog draft. Re-run node scripts/draft-we…
6. Forge Window naming propagation
7. PROOF-FEED-GENERATOR-GATE
8. Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form…
9. Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
10. RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently …
11. FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail p…
12. TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
