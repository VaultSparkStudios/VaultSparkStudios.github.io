# Genius Hit List — Session 278

Generated: 2026-07-13
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **90/100**
- Health: **yellow**
- Current SIL: **999/1000**
- CI health: **check gh run list**
- Current focus: S278 ran the full arc and root-fixed the render-blocking-script class behind the red Lighthouse gate. CI on the S277 tip proved e2e/axe/compliance green but Lighthouse red on /community/ 0.81<0.82 (core) and /ranks/ 0.81<0.82 (trust) — each off by one hundredth, homepage was NOT the current red. Found the concrete lever on /ranks/: an eager render-blocking supabase-client.js (small enough to pass the 80KB byte budget yet still a full render-blocking request Lighthouse penalizes by count). Deferred it (+ gated its inline consumer on DOMContentLoaded so the leaderboard still loads) and applied the same provably-safe transform to /join/ + /vault-wall/ — all strict-floor routes now ship ZERO eager first-party blocking scripts (except the documented /vaultsparked/ tier-gate). Second-order: shipped scripts/check-render-blocking-routes.mjs — a structural gate derived from lighthouse-route-tiers.json that closes the byte-budget blind spot (the exact hole that let /ranks/ regress). Documented the S277 SSR/hydrate zero-CLS convention (docs/SSR_ZERO_CLS_CONVENTION.md). /community/ 0.01 + homepage inline-CSS split honestly deferred (no safe headless lever — need throttled-Lighthouse forensics). build:check 204/204 EXIT 0, doctor blockingFailing 0.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Confirm the /ranks/ defer flips its Lighthouse tier green in the next…
Final score: **100**
[S278][VERIFY/P2] Confirm the /ranks/ defer flips its Lighthouse tier green in the next CI run. The S278 fix is measured-safe locally but the 0.81→0.82 flip is only proven by CI Lighthouse.
Why it matters: Confirm the /ranks/ defer flips its Lighthouse tier green in the next  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Rotate TASK_BOARD
Final score: **90**
[S278][ORG/P4] Rotate TASK_BOARD — 146KB with rotatable blocks past the 3-session window (rotate-taskboard --check-size warn-only; build:check EXIT 0). Run node scripts/rotate-taskboard.mjs at a session START (archive-aware; not at a session tail).
Why it matters: Rotate TASK_BOARD is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Homepage LCP measured pass (genius #1, honest-deferred with evidence)…
Final score: **89**
[S277][PERF/P2] Homepage LCP measured pass (genius #1, honest-deferred with evidence). / 0.74 vs 0.76 floor. S277 confirmed the LCP element is fine (164ms local unthrottled); the only lever is the FOUC-risky 47KB render-blocking inline-CSS split on the brand-anchor homepage. Needs a dedicated throttled-Lighthouse before/after + multi-viewport FOUC session. Guarded by check-home-critical-css-contract.mjs. Floor NOT lowered (CANON-031).
Why it matters: Homepage LCP measured pass (genius #1, honest-deferred with evidence). shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [PRODUCT] /community/ 0.81<0.82 (core)
Final score: **81**
[S278][PERF/P3] /community/ 0.81<0.82 (core) — honest-deferred (D-S278.3). No safe structural lever (text-h1 LCP, critical CSS inlined, all-defer). Needs the harness above for a measured lever. Floor NOT lowered (CANON-031).
Why it matters: /community/ 0.81<0.82 (core) is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / run…
Final score: **81**
[S276][PERF/P2] Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / runs 0.74 perf median vs 0.76 floor; /games/ 0.78 vs 0.80. LCP element is a 5.2KB AVIF already preloaded fetchpriority=high — the only lever is the 47KB render-blocking inline-CSS split (36% coverage-unused but conditional → unsafe to strip). Needs critical-CSS re-extraction + deferred load + throttled before/after Lighthouse + multi-viewport FOUC check. Floor intentionally NOT lowered (CANON-031, D-S276.3).
Why it matters: Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / runs was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`


### DEFERRED / GATED

#### 1. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **90**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 2. [VERIFY] Throttled local Lighthouse before/after harness (multi-viewport FOUC …
Final score: **88**
[S278][PERF/P2] Throttled local Lighthouse before/after harness (multi-viewport FOUC capture) — HIGHEST-LEVERAGE NEXT BUILD. The single missing capability blocking /community/ 0.01 (D-S278.3), the homepage inline-CSS split, AND confirmation of the /ranks/ flip.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **87**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 4. [SECURITY] TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys ac…
Final score: **87**
[S186][SECURITY/P1] TT-ENFORCE-REPROBE. S257 reprobe refreshed evidence: 401 tt:* keys across 26 counter days/30d, so enforce flip remains AMBER. The current July 3 /leaderboards/ fallback/skeleton sink was root-fixed with DOM row helpers; older/stale clusters and cross-repo baton still require fresh near-zero soak proof before founder-device flip.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 5. [VERIFY] Homepage Lighthouse 0.85 restoration. Current committed Lighthouse ev…
Final score: **83**
[S270][PERF/P2] Homepage Lighthouse 0.85 restoration. Current committed Lighthouse evidence has / around 0.76; do not claim the homepage meets 0.85 until a focused trace-backed performance pass proves it.
Why it matters: Requires a focused trace-backed performance pass before a stricter Lighthouse target can be claimed.

#### 6. [AI] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure…
Final score: **82**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Founder public-safe exposure call for cross-project/sealed IGNIS intelligence.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 7. [SECURITY] TT-ENFORCE-REPROBE
Final score: **75**
[S180→S184][SECURITY/P1] TT-ENFORCE-REPROBE — REPROBED S184, verdict AMBER. Ran probe + analyzer 2026-06-10: 148 violations/30d still present (not the clean GREEN a flip needs). Top sinks: journal/dispatches:364 (×30, recurring), home-idle-loader.js:16, football-gm appCore.js (cross-repo), schema-injector.js:23, ambient.shell. Burn-down plan + flip command in docs/TT_ENFORCE_READINESS_2026-06-10.md. Flip stays founder-device gated (SOUL #3). Carry stays OPEN — next step is named-policy migration of the 4 first-party sinks + an Ark cargo to football-gm.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 8. [PRODUCT] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game not…
Final score: **72**
[S187][FEATURE/P2] WISHLIST-MOMENTUM-PROOF. Aggregate "N waiting" on unreleased game notify sections. BLOCKED on Supabase admin (capability MISSING locally) — needs count access.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. Confirm the /ranks/ defer flips its Lighthouse tier green in the next…
2. Post-push CI confirmation
3. Rotate TASK_BOARD
4. Homepage LCP measured pass (genius #1, honest-deferred with evidence)…
5. /community/ 0.81<0.82 (core)
6. Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / run…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
