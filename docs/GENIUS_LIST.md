# Genius Hit List — Session 276

Generated: 2026-07-13
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **93/100**
- Health: **yellow**
- Current SIL: **998/1000**
- CI health: **check gh run list**
- Current focus: S276 ran the full arc and shipped 6 commits to main. Restored the E2E compliance job to GREEN (verified success on CI) — root-caused the ~2-day red to a generated-layer strand: S275 committed two new OG images without regenerating data/lqip-map.json, plus hourly [skip ci] feed crons stranded public-intelligence/citation/public-status; resynced the full derived layer. Killed the /studio-pulse/ CLS 1.0355->0.0446 (95.7%, probe-verified) via a static reserved kinesis mount (box+svg aspect-ratio in critical CSS). Resolved all 27 orphan-script warnings (2 deleted · 3 wired as gates · 22 allowlisted-with-rationale) and flipped the gate --warn-only->--check (blocking). Root-fixed the Forge-Window phantom leak: generate-genius-list now reads archived decision shards like its validator, and both route through a new shared scripts/lib/decisions-corpus.mjs so they can never diverge again.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / run…
Final score: **100**
[S276][PERF/P2] Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / runs 0.74 perf median vs 0.76 floor; /games/ 0.78 vs 0.80. LCP element is a 5.2KB AVIF already preloaded fetchpriority=high — the only lever is the 47KB render-blocking inline-CSS split (36% coverage-unused but conditional → unsafe to strip). Needs critical-CSS re-extraction + deferred load + throttled before/after Lighthouse + multi-viewport FOUC check. Floor intentionally NOT lowered (CANON-031, D-S276.3).
Why it matters: Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / runs shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [VERIFY] CI CLS-regression gate. Run probe-cls-bisect on key routes in a brows…
Final score: **94**
[S276][AUTOMATION/P3] CI CLS-regression gate. Run probe-cls-bisect on key routes in a browser job, fail if buffered CLS > 0.1 → structural prevention of the 1.03-accumulation class. (SIL brainstorm #2.)
Why it matters: CI CLS-regression gate. Run probe-cls-bisect on key routes in a browse shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] /changelog/ (0.73) + /games/ (0.18) CLS via build-time SSR generator.…
Final score: **81**
[S276][PERF/P2] /changelog/ (0.73) + /games/ (0.18) CLS via build-time SSR generator. Offenders measured: you-asked-shipped box 458px desktop/704px mobile (row-count-dependent → min-height brittle); intent-flight-director on 8 routes, no id hook. Fix = SSR from the committed feed with a shared browser/Node renderer + drift gate (dual-audience, CANON-048).
Why it matters: /changelog/ (0.73) + /games/ (0.18) CLS via build-time SSR generator.  is open, local, and unblocked — can ship this session.



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

1. Homepage LCP measured pass (Lighthouse route-tier red, HONEST). / run…
2. Post-push CI confirmation
3. CI CLS-regression gate. Run probe-cls-bisect on key routes in a brows…
4. /changelog/ (0.73) + /games/ (0.18) CLS via build-time SSR generator.…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
