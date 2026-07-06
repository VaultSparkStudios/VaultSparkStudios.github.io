# Genius Hit List — Session 261

Generated: 2026-07-06
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **81/100**
- Health: **green**
- Current SIL: **999/500**
- CI health: **check gh run list**
- Current focus: S261 /arc shipped TT active-local manifest generation, a manifest-backed active sink guard, warm local DOM sink burn-down across leaderboard widget/IGNIS/changelog/Football GM, and passed build-check 171/171.

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

#### 2. [VERIFY] Obelisk RP credential + Supabase bridge soak. Once obelisk.identity.v…
Final score: **93**
[S259][IDENTITY/P1] Obelisk RP credential + Supabase bridge soak. Once obelisk.identity.verify has RP keys/endpoints, wire the server-side bridge through the secrets gateway, add provider-session soak proof, and only then consider flipping default provider truth.
Why it matters: Obelisk RP credential + Supabase bridge soak. Once obelisk.identity.ve was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

#### 3. [PRODUCT] play-next conversion redesign
Final score: **90**
[ENGAGE/P1] play-next conversion redesign — once the honest window has data — S249 fixed the impression metric (IntersectionObserver true-viewport play-next:shown; epoch bumped 2026-07-02). Let ~1 week of honest viewport-view vs click data accrue, THEN decide placement vs copy vs retire from a trustworthy denominator (the 37/0 was a dishonest trigger-fire count).
Why it matters: play-next conversion redesign is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Atlas registry freshness reconciliation
Final score: **87**
[OPS/P2] Atlas registry freshness reconciliation — advisory: public canonical atlas is not on the local registry/site mapping; resolve via the owning source or Ark (studio-ops-owned canonical description still empty).
Why it matters: Atlas registry freshness reconciliation is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **84**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [PRODUCT] INP root-fix when CLEAN field data lands
Final score: **81**
[SIL:2⛔][PERF/P1] INP root-fix when CLEAN field data lands — S247 interactionId filter deployed 2026-07-02; re-attempt ~2026-07-09 with data/inp-breakdown.json routeVitals + phase data to fix the dominant route/handler/phase. (externally time-blocked — exempt from skip-count until 2026-07-09)
Why it matters: INP root-fix when CLEAN field data lands is open, local, and unblocked — can ship this session.

#### 3. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **81**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Review + publish the forge devlog draft. journal/_drafts/forge-week-20 affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [SECURITY] TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys ac…
Final score: **81**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys across 26 counter days/30d, so enforce flip remains AMBER. The current July 3 /leaderboards/ fallback/skeleton sink was root-fixed with DOM row helpers; older/stale clusters and cross-repo baton still require fresh near-zero soak proof before founder-device flip.
Why it matters: TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys acr lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 5. [AI] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…
Final score: **76**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure call for cross-project/sealed IGNIS intelligence.
Why it matters: RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure  must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

### LATER

#### 1. [SECURITY] TT-ENFORCE-REPROBE
Final score: **69**
[S180→S184][SECURITY/P1] TT-ENFORCE-REPROBE — REPROBED S184, verdict AMBER. Ran probe + analyzer 2026-06-10: 148 violations/30d still present (not the clean GREEN a flip needs). Top sinks: journal/dispatches:364 (×30, recurring), home-idle-loader.js:16, football-gm appCore.js (cross-repo), schema-injector.js:23, ambient.shell. Burn-down plan + flip command in docs/TT_ENFORCE_READINESS_2026-06-10.md. Flip stays founder-device gated (SOUL #3). Carry stays OPEN — next step is named-policy migration of the 4 first-party sinks + an Ark cargo to football-gm.
Why it matters: TT-ENFORCE-REPROBE lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 2. [PRODUCT] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game not…
Final score: **66**
[S187][FEATURE/P2] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game notify sections. BLOCKED on Supabase admin (capability MISSING locally) — needs count access.
Why it matters: WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game noti is open, local, and unblocked — can ship this session.

#### 3. [SECURITY] TT-ENFORCE-REPROBE. Updated S257: fresh reprobe is AMBER (401 tt:* ke…
Final score: **66**
[S185][SECURITY/P1] TT-ENFORCE-REPROBE. Updated S257: fresh reprobe is AMBER (401 tt:* keys, 26 counter days/30d). Current local /leaderboards/ July 3 fallback/skeleton sink was fixed with DOM row helpers and propagated; next step is post-deploy soak verification, stale-cluster aging, and any cross-repo handling before founder-device enforce flip.
Why it matters: TT-ENFORCE-REPROBE. Updated S257: fresh reprobe is AMBER (401 tt:* key lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

## Recommended Build Order

1. Post-push CI confirmation
2. Obelisk RP credential + Supabase bridge soak. Once obelisk.identity.v…
3. play-next conversion redesign
4. Atlas registry freshness reconciliation
5. Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
6. INP root-fix when CLEAN field data lands
7. Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
8. TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys ac…
9. RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…
10. TT-ENFORCE-REPROBE
11. WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game not…
12. TT-ENFORCE-REPROBE. Updated S257: fresh reprobe is AMBER (401 tt:* ke…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
