# Genius Hit List — Session 190

Generated: 2026-06-12
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **84/100**
- Health: **green**
- Current SIL: **960/500**
- CI health: **check gh run list**
- Current focus: S190 goal-chain (/start -> /audit -> /implement -> /closeout): deepen the funnel layer. Shipped 10/10, build:check green. funnel-waterfall-pedagogical (5-stage waterfall on /status/ funnel tile; sessionsCompleted now build-derived), session-velocity-trust-badge (animated counter + velocity on /studio/), progressive-membership-unlock (4-stage classifier + 3 callout blocks on /membership/; Worker allowlist updated), forge-devlog-soul-voice-upgrade (16-term forbidden-terms table; SOUL-voice narrative), changelog-entry-auto-derive (generate-changelog-entry.mjs 17/17), proof-embed-card (standalone embeddable trust card; /status/ Share this proof section), oracle-chip-ranking (helpful-rate re-ranking from oracle-feedback.ndjson), oracle-corpus-feedback-loop (rollup-rum-ux feeds oracle-feedback.ndjson on unhelpful>=2 days), tt-default-policy-finish (clarifying TT comment on schema-injector.js).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Confirm S190 features on prod after deploy. (a) /status/ funnel water…
Final score: **100**
[S190][VERIFY/P1] Confirm S190 features on prod after deploy. (a) /status/ funnel waterfall renders 5 stages in honest-dark (——/——/——/——/——); (b) /studio/ session counter animates on scroll; (c) /membership/ stage-1 callout is absent on first visit (no localStorage signals yet); (d) proof-card:embed beacon lands in /v/rum when the embed preview loads on /status/; (e) Worker deploys the updated RUM_UX_EVENTS allowlist including membership-unlock:stage-*. Verify via pages.dev origin; never assume push==deploy.
Why it matters: Confirm S190 features on prod after deploy. (a) /status/ funnel waterf shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Oracle per-cluster feedback granularity. oracle-feedback.ndjson curre…
Final score: **93**
[S190→][FEATURE/P2] Oracle per-cluster feedback granularity. oracle-feedback.ndjson currently uses clusterKey: '*' (global aggregate). Once the frontend emits the cluster key alongside the 👍/👎 beacon, switch rollup-rum-ux.mjs to per-cluster rows. The schema is already in place; only the emit-site needs updating.
Why it matters: Oracle per-cluster feedback granularity. oracle-feedback.ndjson curren is open, local, and unblocked — can ship this session.

#### 4. [SECURITY] TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; p…
Final score: **93**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; pre-S185 samples aging out. Flip stays SOUL #3 founder-device gated.
Why it matters: TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; pr lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

### NEXT

#### 1. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **90**
[S189][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md — S190 upgraded the drafter to SOUL-voice narrative; the draft itself was generated before the upgrade. Re-run node scripts/draft-weekly-forge.mjs to get the new-voice output, then founder reviews + publishes to journal/ to clear the stale journal warn-gate.
Why it matters: Review + publish the forge devlog draft. journal/_drafts/forge-week-20 affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [VERIFY] Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form…
Final score: **81**
[S188][VERIFY/P0] Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form renders + submits on a NON-home page (e.g. /faq/, /games/call-of-doodie/) — a real test subscriber lands via Kit; (b) Discord + Community Hub show in the Studio nav dropdown sitewide; (c) proof-line:{shown,click} + studio-dispatch:subscribe + play-next:* land in /v/rum; (d) call-of-doodie hero promise line renders. Verify via pages.dev origin + a prod path — never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]). Shell hash rotated this session → confirm cold-cache load is healthy.
Why it matters: Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form  was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **81**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then).
Why it matters: Review + publish the forge devlog draft. journal/_drafts/forge-week-20 affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 5. [BRAND] RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently …
Final score: **78**
[S188][SIL] RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently passes with the nav-sheet: dynamic prefix covering its 4 entries. If a future RUM name is added to the Worker but never emitted, the gate WARNs (dead config) — periodically clear dead entries so the allowlist stays an honest map of live instrumentation.
Why it matters: RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently p affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### LATER

#### 1. [BRAND] FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail p…
Final score: **72**
[S187][UX/P2] FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail pages (narrative hero + screenshot + single CTA + voice copy). 4h; next session.
Why it matters: FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail pa affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [SECURITY] TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm…
Final score: **72**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm appCore.js baton + pre-S185 samples to age out. Reprobe ~2026-06-18; flip stays SOUL #3 founder-device gated.
Why it matters: TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm  lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 3. [PRODUCT] PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h). Core visit-depth nudge …
Final score: **69**
[S185→][UX/P1] PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h). Core visit-depth nudge already lives in returning-visitor-digest.js (S178); full multi-stage progressive disclosure is the build.
Why it matters: PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h). Core visit-depth nudge a is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. Confirm S190 features on prod after deploy. (a) /status/ funnel water…
2. Post-push CI confirmation
3. Oracle per-cluster feedback granularity. oracle-feedback.ndjson curre…
4. TT-ENFORCE-REPROBE. First-party surface CLEAN. Reprobe ~2026-06-18; p…
5. Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
6. Forge Window naming propagation
7. Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form…
8. Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
9. RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently …
10. FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail p…
11. TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm…
12. PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h). Core visit-depth nudge …

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
