# Genius Hit List — Session 188

Generated: 2026-06-12
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **84/100**
- Health: **green**
- Current SIL: **950/500**
- CI health: **check gh run list**
- Current focus: S188 goal-chain (/start -> /audit -> /implement -> /closeout): finish the funnel S187 started + close the S186 silent-drop bug class. Shipped 7/7, build:check green. sitewide-footer-dispatch (capture 1 page -> all 90 via propagate-nav), rum-allowlist-integrity-gate (check-rum-allowlist.mjs 7/7 — ERRORs on emitted-but-unallowlisted RUM names = the S186 silent edge-drop; wired into build:check), proof-line-telemetry (S186 microline was blind; added proof-line:{shown,click} beacons), audit-freshness-in-plumbing (staleness check is now a build:check gate, not a habit), stale-board-hygiene (reconciled the phantom vaultsparked-proof.js founder-action; 0 actionable orphans), flagship-product-storytelling (additive SOUL-voice hero promise on call-of-doodie, no mature-surface rebuild), shell-reconcile (hash rotated, 104 pages re-stamped).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form…
Final score: **100**
[S188][VERIFY/P0] Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form renders + submits on a NON-home page (e.g. /faq/, /games/call-of-doodie/) — a real test subscriber lands via Kit; (b) Discord + Community Hub show in the Studio nav dropdown sitewide; (c) proof-line:{shown,click} + studio-dispatch:subscribe + play-next:* land in /v/rum; (d) call-of-doodie hero promise line renders. Verify via pages.dev origin + a prod path — never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]). Shell hash rotated this session → confirm cold-cache load is healthy.
Why it matters: Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **93**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then).
Why it matters: Review + publish the forge devlog draft. journal/_drafts/forge-week-20 affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [BRAND] RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently …
Final score: **90**
[S188][SIL] RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently passes with the nav-sheet: dynamic prefix covering its 4 entries. If a future RUM name is added to the Worker but never emitted, the gate WARNs (dead config) — periodically clear dead entries so the allowlist stays an honest map of live instrumentation.
Why it matters: RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently p affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [BRAND] FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail p…
Final score: **84**
[S187][UX/P2] FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail pages (narrative hero + screenshot + single CTA + voice copy). 4h; next session.
Why it matters: FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail pa affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [SECURITY] TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm…
Final score: **84**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm appCore.js baton + pre-S185 samples to age out. Reprobe ~2026-06-18; flip stays SOUL #3 founder-device gated.
Why it matters: TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm  lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 4. [PRODUCT] PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h). Core visit-depth nudge …
Final score: **81**
[S185→][UX/P1] PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h). Core visit-depth nudge already lives in returning-visitor-digest.js (S178); full multi-stage progressive disclosure is the build.
Why it matters: PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h). Core visit-depth nudge a is open, local, and unblocked — can ship this session.

#### 5. [AI] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…
Final score: **79**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure call for cross-project/sealed IGNIS intelligence.
Why it matters: RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure  must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

### LATER

#### 1. [PRODUCT] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game not…
Final score: **75**
[S187][FEATURE/P2] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game notify sections. BLOCKED on Supabase admin (capability MISSING locally) — needs count access.
Why it matters: WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game noti is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] PROOF-LINE-TELEMETRY. The proof microline ships blind. Add an allowli…
Final score: **69**
[S186][SIL] PROOF-LINE-TELEMETRY. The proof microline ships blind. Add an allowlisted proof-line:shown RUM event in proof-conversion-line.js + extend RUM_UX_EVENTS, so its conversion lift is measurable.
Why it matters: PROOF-LINE-TELEMETRY. The proof microline ships blind. Add an allowlis is open, local, and unblocked — can ship this session.

#### 3. [SECURITY] TT-ENFORCE-REPROBE
Final score: **69**
[S180→S184][SECURITY/P1] TT-ENFORCE-REPROBE — REPROBED S184, verdict AMBER. Ran probe + analyzer 2026-06-10: 148 violations/30d still present (not the clean GREEN a flip needs). Top sinks: journal/dispatches:364 (×30, recurring), home-idle-loader.js:16, football-gm appCore.js (cross-repo), schema-injector.js:23, ambient.shell. Burn-down plan + flip command in docs/TT_ENFORCE_READINESS_2026-06-10.md. Flip stays founder-device gated (SOUL #3). Carry stays OPEN — next step is named-policy migration of the 4 first-party sinks + an Ark cargo to football-gm.
Why it matters: TT-ENFORCE-REPROBE lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

## Recommended Build Order

1. Confirm S188 + S187 features on prod. (a) Studio Dispatch footer form…
2. Post-push CI confirmation
3. Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
4. RUM-DEAD-ALLOWLIST-SWEEP. The new check-rum-allowlist gate currently …
5. Forge Window naming propagation
6. FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail p…
7. TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm…
8. PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h). Core visit-depth nudge …
9. RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…
10. WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game not…
11. PROOF-LINE-TELEMETRY. The proof microline ships blind. Add an allowli…
12. TT-ENFORCE-REPROBE

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
