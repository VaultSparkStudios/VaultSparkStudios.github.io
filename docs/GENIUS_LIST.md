# Genius Hit List — Session 187

Generated: 2026-06-11
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **84/100**
- Health: **green**
- Current SIL: **957/500**
- CI health: **check gh run list**
- Current focus: S187 goal-chain + competitive analysis of top independent studios. The scan reframed a 96%-SIL site: VaultSpark is AHEAD on infra (machine-SEO, perf, build-in-public transport, press kit) but UNDER-built on conversion/funnel/proof. Shipped 5: audit-freshness-precheck (deterministic already-done guard, caught 3 dupes), studio-soul-weekly-forge (ledger->stale-devlog drafter + freshness gate), honest-traction-scoreboard (live/forge/SEALED proof on /studio/), cross-game-play-next (catalog routing, never dead-ends), studio-dispatch-optin (activated dead footer email-capture via existing ConvertKit ESP — no new vendor).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Confirm on prod (S187 features): honest-traction strip renders on /st…
Final score: **100**
[S187][VERIFY/P0] Confirm on prod (S187 features): honest-traction strip renders on /studio/; footer "Studio Dispatch" capture submits to ConvertKit (a real test subscriber lands); cross-game "play next" card renders on game pages; play-next:* + studio-dispatch:subscribe land in RUM. (Verify via pages.dev + a prod path, never assume push==deploy.)
Why it matters: Confirm on prod (S187 features): honest-traction strip renders on /stu shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **93**
[S187][CONTENT/P1] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews voice, then publish to journal/ to clear the 81d-stale gate.
Why it matters: Review + publish the forge devlog draft. journal/_drafts/forge-week-20 affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [INTELLIGENCE] WIRE-FRESHNESS-INTO-AUDIT. Add the check-audit-staleness.mjs call to …
Final score: **93**
[S187→][SIL] WIRE-FRESHNESS-INTO-AUDIT. Add the check-audit-staleness.mjs call to the /audit skill protocol (step 5, before scoring) so every future audit auto-greps for prior art. First step: edit the audit skill body to invoke it per candidate.
Why it matters: WIRE-FRESHNESS-INTO-AUDIT. Add the check-audit-staleness.mjs call to t keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

### NEXT

#### 1. [BRAND] SITEWIDE-FOOTER-DISPATCH. Promote the homepage footer "Studio Dispatc…
Final score: **87**
[S187→][SIL] SITEWIDE-FOOTER-DISPATCH. Promote the homepage footer "Studio Dispatch" column into the propagate-nav.mjs footer template + re-propagate so capture is on all ~115 pages, not just home. First step: add the column to the footer block in propagate-nav.
Why it matters: SITEWIDE-FOOTER-DISPATCH. Promote the homepage footer "Studio Dispatch affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [BRAND] DISCORD-TO-NAV. Promote Discord + Community Hub from footer-social to…
Final score: **84**
[S187][GROWTH/P2] DISCORD-TO-NAV. Promote Discord + Community Hub from footer-social to primary nav (community is a retention funnel; currently footer-only). Needs a propagate-nav run.
Why it matters: DISCORD-TO-NAV. Promote Discord + Community Hub from footer-social to  affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [BRAND] FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail p…
Final score: **78**
[S187][UX/P2] FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail pages (narrative hero + screenshot + single CTA + voice copy). 4h; next session.
Why it matters: FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail pa affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 5. [SECURITY] TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm…
Final score: **78**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm appCore.js baton + pre-S185 samples to age out. Reprobe ~2026-06-18; flip stays SOUL #3 founder-device gated.
Why it matters: TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm  lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

### LATER

#### 1. [PRODUCT] PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h). Core visit-depth nudge …
Final score: **75**
[S185→][UX/P1] PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h). Core visit-depth nudge already lives in returning-visitor-digest.js (S178); full multi-stage progressive disclosure is the build.
Why it matters: PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h). Core visit-depth nudge a is open, local, and unblocked — can ship this session.

#### 2. [AI] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…
Final score: **73**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure call for cross-project/sealed IGNIS intelligence.
Why it matters: RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure  must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

#### 3. [PRODUCT] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game not…
Final score: **69**
[S187][FEATURE/P2] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game notify sections. BLOCKED on Supabase admin (capability MISSING locally) — needs count access.
Why it matters: WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game noti is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. Confirm on prod (S187 features): honest-traction strip renders on /st…
2. Post-push CI confirmation
3. Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
4. WIRE-FRESHNESS-INTO-AUDIT. Add the check-audit-staleness.mjs call to …
5. SITEWIDE-FOOTER-DISPATCH. Promote the homepage footer "Studio Dispatc…
6. Forge Window naming propagation
7. DISCORD-TO-NAV. Promote Discord + Community Hub from footer-social to…
8. FLAGSHIP-PRODUCT-STORYTELLING. Upgrade top 3-4 flagship game detail p…
9. TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm…
10. PROGRESSIVE-MEMBERSHIP-UNLOCK. Deferred (8h). Core visit-depth nudge …
11. RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…
12. WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game not…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
