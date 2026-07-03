# Genius Hit List — Session 251

Generated: 2026-07-03
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **81/100**
- Health: **green**
- Current SIL: **999/500**
- CI health: **check gh run list**
- Current focus: S251 /arc: confirmed CI/deploy green after a transient GitHub Pages retry, then found and closed 9 phantom-open TASK_BOARD carries — items whose described work (PROOF-LINE-TELEMETRY, IGNIS-HINT-CONVERSION-TRACKING, CLOSEOUT-BUILD-ORDER-MODULE, SearchAction /search/, CSP nonce migration, rate-limit+CSRF, Ask IGNIS concierge, cross-portal shell, ETERNAL tier vocabulary, PROGRESSIVE-MEMBERSHIP-UNLOCK) had already shipped in earlier sessions but whose checkboxes were never flipped because they lived in historical sections past the stale-task gate's 3-session recency window. Also verified a Lighthouse-flagged homepage LCP 'regression' was a false lead (7-day-stale lab artifact; real field RUM shows healthy p75 1276ms) before acting on it.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 2. [PRODUCT] play-next conversion redesign
Final score: **93**
[ENGAGE/P1] play-next conversion redesign — once the honest window has data — S249 fixed the impression metric (IntersectionObserver true-viewport play-next:shown; epoch bumped 2026-07-02). Let ~1 week of honest viewport-view vs click data accrue, THEN decide placement vs copy vs retire from a trustworthy denominator (the 37/0 was a dishonest trigger-fire count).
Why it matters: play-next conversion redesign is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Atlas registry freshness reconciliation
Final score: **90**
[OPS/P2] Atlas registry freshness reconciliation — advisory: public canonical atlas is not on the local registry/site mapping; resolve via the owning source or Ark (studio-ops-owned canonical description still empty).
Why it matters: Atlas registry freshness reconciliation is open, local, and unblocked — can ship this session.

#### 4. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **87**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### NEXT

#### 1. [PRODUCT] INP root-fix when CLEAN field data lands
Final score: **84**
[SIL:2⛔][PERF/P1] INP root-fix when CLEAN field data lands — S247 interactionId filter deployed 2026-07-02; re-attempt ~2026-07-09 with data/inp-breakdown.json routeVitals + phase data to fix the dominant route/handler/phase. (externally time-blocked — exempt from skip-count until 2026-07-09)
Why it matters: INP root-fix when CLEAN field data lands is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **84**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Review + publish the forge devlog draft. journal/_drafts/forge-week-20 affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [SECURITY] TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm…
Final score: **84**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm appCore.js baton + pre-S185 samples to age out. Reprobe ~2026-06-18; flip stays SOUL #3 founder-device gated.
Why it matters: TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm  lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 4. [AI] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…
Final score: **79**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure call for cross-project/sealed IGNIS intelligence.
Why it matters: RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure  must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

#### 5. [SECURITY] TT-ENFORCE-REPROBE
Final score: **72**
[S180→S184][SECURITY/P1] TT-ENFORCE-REPROBE — REPROBED S184, verdict AMBER. Ran probe + analyzer 2026-06-10: 148 violations/30d still present (not the clean GREEN a flip needs). Top sinks: journal/dispatches:364 (×30, recurring), home-idle-loader.js:16, football-gm appCore.js (cross-repo), schema-injector.js:23, ambient.shell. Burn-down plan + flip command in docs/TT_ENFORCE_READINESS_2026-06-10.md. Flip stays founder-device gated (SOUL #3). Carry stays OPEN — next step is named-policy migration of the 4 first-party sinks + an Ark cargo to football-gm.
Why it matters: TT-ENFORCE-REPROBE lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

### LATER

#### 1. [PRODUCT] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game not…
Final score: **69**
[S187][FEATURE/P2] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game notify sections. BLOCKED on Supabase admin (capability MISSING locally) — needs count access.
Why it matters: WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game noti is open, local, and unblocked — can ship this session.

#### 2. [SECURITY] TT-ENFORCE-REPROBE. home-idle-loader.js:16 + schema-injector.js:23 + …
Final score: **66**
[S185][SECURITY/P1] TT-ENFORCE-REPROBE. home-idle-loader.js:16 + schema-injector.js:23 + ambient.shell still use default policy. Named-policy wave done (S185); remaining: those 2 first-party sinks + Ark cargo to football-gm for appCore.js sinks. Then reprobe for flip. Founder-device gated (SOUL #3).
Why it matters: TT-ENFORCE-REPROBE. home-idle-loader.js:16 + schema-injector.js:23 + a lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 3. [PRODUCT] GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP…
Final score: **63**
[S180][OBS/P3] GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP confirms the origin-migration win globally as samples grow.
Why it matters: GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP  is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. Post-push CI confirmation
2. play-next conversion redesign
3. Atlas registry freshness reconciliation
4. Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
5. INP root-fix when CLEAN field data lands
6. Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
7. TT-ENFORCE-REPROBE. First-party surface CLEAN. Remaining: football-gm…
8. RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…
9. TT-ENFORCE-REPROBE
10. WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game not…
11. TT-ENFORCE-REPROBE. home-idle-loader.js:16 + schema-injector.js:23 + …
12. GEO-VITALS-WATCH. api/geo-vitals.json (US:107 GB:3); check non-US LCP…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
