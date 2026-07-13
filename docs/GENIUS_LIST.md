# Genius Hit List — Session 275

Generated: 2026-07-13
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **94/100**
- Health: **yellow**
- Current SIL: **998/1000**
- CI health: **check gh run list**
- Current focus: S275 recovered a dead session, root-caused 9-days-dark telemetry ingest (production worker clobbered 07-03 by an out-of-band deploy — live build missing all /v/* handlers), and shipped a 20-item audit: oracle CLS 0.86→0.0006, changelog build-time render, INP hover-pollution fix, robots/.well-known AI-corpus unblock + coherence gate, 13/13 verify_jwt pins, hero Join-The-Vault promotion, ledger rotation (2.88MB→943KB), orphan-scripts gate, worker-ingest currency probe.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [AI] Post-paint widget mounts shift layout on /studio-pulse/ (CLS 0.94). F…
Final score: **100**
[S275][PERF/P2] Post-paint widget mounts shift layout on /studio-pulse/ (CLS 0.94). Five ambient widgets construct their DOM after first paint (bottom-sheet loader, genome strip, flight director, rate-page, kinesis); apply the oracle static-mount + reserved-height treatment per widget. Bisected + reproducible: ROUTE=/studio-pulse/ node scripts/probe-cls-bisect.mjs (needs local-preview-server on 4173). /changelog/ residual 0.69 (time-machine injection) + /games/ 0.20 are the same class.
Why it matters: Post-paint widget mounts shift layout on /studio-pulse/ (CLS 0.94). Fi must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Orphan-script triage: 26 remaining warn-only findings from check-orph…
Final score: **93**
[S275][ORG/P3] Orphan-script triage: 26 remaining warn-only findings from check-orphan-scripts --warn-only — wire, allowlist-with-rationale, or delete each.
Why it matters: Orphan-script triage: 26 remaining warn-only findings from check-orpha is open, local, and unblocked — can ship this session.

#### 4. [INTELLIGENCE] Homepage field LCP 2727ms p75 (audit #6, deferred with evidence). 54K…
Final score: **93**
[S275][PERF/P3] Homepage field LCP 2727ms p75 (audit #6, deferred with evidence). 54KB inline style split is high-FOUC-risk vs the home critical-CSS contract; needs a measured pass with before/after Lighthouse. Ambient-loader split (audit #13) premise revised: the rank-1 "candidate" is the loader core itself — needs a real split plan, not a mechanical move.
Why it matters: Homepage field LCP 2727ms p75 (audit #6, deferred with evidence). 54KB keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`


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

1. Post-paint widget mounts shift layout on /studio-pulse/ (CLS 0.94). F…
2. Post-push CI confirmation
3. Orphan-script triage: 26 remaining warn-only findings from check-orph…
4. Homepage field LCP 2727ms p75 (audit #6, deferred with evidence). 54K…
5. Forge Window naming propagation

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
