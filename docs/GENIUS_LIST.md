# Genius Hit List — Session 277

Generated: 2026-07-13
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **94/100**
- Health: **yellow**
- Current SIL: **999/1000**
- CI health: **check gh run list**
- Current focus: S277 ran the full arc and eliminated the site's largest layout-shift class via build-time SSR. Root-fixed the /changelog/ CLS 0.7332->0.0006 (99.9%, probe-verified) by SSR-ing the you-asked-shipped closed-loop box from the committed ship-receipts feed at build (was a ~0.50 post-paint injector) — new shared renderer lib + drift gate. Killed the intent-flight-director CLS on /universe/ 0.2701->0.0006 and /games/ 0.1822->0.0006 by SSR-ing the Pathfinder panel (client now re-ranks the 3 slots IN PLACE, preserving local-first personalization with zero shift). Reserved the /membership/ interview mount 0.1135->0.0006. Shipped a BLOCKING CLS-regression gate (tests/cls-regression.spec.js, 8 routes @0.10 ceiling, wired into the e2e compliance job) — structural prevention of the accumulation class. Bonus root-fix: pathways-router threw an uncaught VSPublicIntel error on /universe/,/games/,/join/,/invite/,/vaultsparked/ (defer-vs-idle load race) — now renders base pathways immediately regardless of intel. build:check 202/202 EXIT 0, doctor 15/15 blockingFailing 0.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Homepage LCP measured pass (genius #1, honest-deferred with evidence)…
Final score: **100**
[S277][PERF/P2] Homepage LCP measured pass (genius #1, honest-deferred with evidence). / 0.74 vs 0.76 floor. S277 confirmed the LCP element is fine (164ms local unthrottled); the only lever is the FOUC-risky 47KB render-blocking inline-CSS split on the brand-anchor homepage. Needs a dedicated throttled-Lighthouse before/after + multi-viewport FOUC session. Guarded by check-home-critical-css-contract.mjs. Floor NOT lowered (CANON-031).
Why it matters: Homepage LCP measured pass (genius #1, honest-deferred with evidence). shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Document the SSR + client-skip/hydrate convention so future post-pain…
Final score: **93**
[S277][DX/P4] Document the SSR + client-skip/hydrate convention so future post-paint widgets start zero-CLS by default (SIL brainstorm #4). Reference the 2 S277 libs.
Why it matters: Document the SSR + client-skip/hydrate convention so future post-paint is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] /universe/ never loads public-intelligence.js (ambient-loader when-cl…
Final score: **90**
[S277][INTEL/P4] /universe/ never loads public-intelligence.js (ambient-loader when-clause excludes it) — pathways now render base content there, but intel enrichment is silently absent. Confirm intended vs. add universe to the loader.
Why it matters: /universe/ never loads public-intelligence.js (ambient-loader when-cla is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [VERIFY] Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / run…
Final score: **89**
[S276][PERF/P2] Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / runs 0.74 perf median vs 0.76 floor; /games/ 0.78 vs 0.80. LCP element is a 5.2KB AVIF already preloaded fetchpriority=high — the only lever is the 47KB render-blocking inline-CSS split (36% coverage-unused but conditional → unsafe to strip). Needs critical-CSS re-extraction + deferred load + throttled before/after Lighthouse + multi-viewport FOUC check. Floor intentionally NOT lowered (CANON-031, D-S276.3).
Why it matters: Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / runs shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`


### DEFERRED / GATED

#### 1. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **93**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 2. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **90**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 3. [SECURITY] TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys ac…
Final score: **90**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys across 26 counter days/30d, so enforce flip remains AMBER. The current July 3 /leaderboards/ fallback/skeleton sink was root-fixed with DOM row helpers; older/stale clusters and cross-repo baton still require fresh near-zero soak proof before founder-device flip.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 4. [VERIFY] Homepage Lighthouse 0.85 restoration. Current committed Lighthouse ev…
Final score: **86**
[S270][PERF/P2] Homepage Lighthouse 0.85 restoration. Current committed Lighthouse evidence has / around 0.76; do not claim the homepage meets 0.85 until a focused trace-backed performance pass proves it.
Why it matters: Requires a focused trace-backed performance pass before a stricter Lighthouse target can be claimed.

#### 5. [AI] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…
Final score: **85**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure call for cross-project/sealed IGNIS intelligence.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 6. [SECURITY] TT-ENFORCE-REPROBE
Final score: **78**
[S180→S184][SECURITY/P1] TT-ENFORCE-REPROBE — REPROBED S184, verdict AMBER. Ran probe + analyzer 2026-06-10: 148 violations/30d still present (not the clean GREEN a flip needs). Top sinks: journal/dispatches:364 (×30, recurring), home-idle-loader.js:16, football-gm appCore.js (cross-repo), schema-injector.js:23, ambient.shell. Burn-down plan + flip command in docs/TT_ENFORCE_READINESS_2026-06-10.md. Flip stays founder-device gated (SOUL #3). Carry stays OPEN — next step is named-policy migration of the 4 first-party sinks + an Ark cargo to football-gm.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 7. [PRODUCT] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game not…
Final score: **75**
[S187][FEATURE/P2] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game notify sections. BLOCKED on Supabase admin (capability MISSING locally) — needs count access.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 8. [SECURITY] TT-ENFORCE-REPROBE. Updated S257: fresh reprobe is AMBER (401 tt:* ke…
Final score: **75**
[S185][SECURITY/P1] TT-ENFORCE-REPROBE. Updated S257: fresh reprobe is AMBER (401 tt:* keys, 26 counter days/30d). Current local /leaderboards/ July 3 fallback/skeleton sink was fixed with DOM row helpers and propagated; next step is post-deploy soak verification, stale-cluster aging, and any cross-repo handling before founder-device enforce flip.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

## Recommended Build Order

1. Homepage LCP measured pass (genius #1, honest-deferred with evidence)…
2. Post-push CI confirmation
3. Document the SSR + client-skip/hydrate convention so future post-pain…
4. /universe/ never loads public-intelligence.js (ambient-loader when-cl…
5. Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / run…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
