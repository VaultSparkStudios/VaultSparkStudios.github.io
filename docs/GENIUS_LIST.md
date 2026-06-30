# Genius Hit List — Session 239

Generated: 2026-06-30
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **84/100**
- Health: **green**
- Current SIL: **997/500**
- CI health: **check gh run list**
- Current focus: S239 full /arc: P0 production outage diagnosed and fixed (HTMLRewriter double-clone deadlock; homepage hung indefinitely after every cache purge since S238 deploy). Three second-order innovations shipped: OG-coverage observability feed (api/og-coverage.json), Worker rewriter safety gate (check-worker-rewriter-safety.mjs), post-purge edge liveness check in pages-deploy.yml. Genius list exhausted with evidence — VideoGame JSON-LD and unique OG cards were already done; INP remains data-blocked; blockDays already generalized. npm run build EXIT 0; npm run build:check EXIT 0; smoke-live PASSED 6/6.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] INP root-fix when field data lands
Final score: **96**
[SIL][PERF/P1] INP root-fix when field data lands — when data/inp-breakdown.json has real route samples, fix the dominant route/handler/phase. Do NOT implement without evidence.
Why it matters: INP root-fix when field data lands is open, local, and unblocked — can ship this session.

#### 2. [INTELLIGENCE] Streaming-response double-clone audit
Final score: **96**
[SIL][WORKER] Streaming-response double-clone audit — audit all other Worker code paths that call .clone() on a streaming Response (ReadableStream tees, fetch proxies, etc.) to close the broader class beyond HTMLRewriter.
Why it matters: Streaming-response double-clone audit keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 3. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 4. [PRODUCT] OG-coverage observability
Final score: **90**
[SIL][AI/DISCOVERY] OG-coverage observability — consider emitting OG-card coverage (carded vs intentionally-dark vs total) as a small tracked metric so triage state is observable over time, not just a build-time count.
Why it matters: OG-coverage observability is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Proof-feed publisher parity
Final score: **87**
[SIL][INFRA/P2] Proof-feed publisher parity — now that freshness ceilings cover 11 feeds, add a small publisher inventory/check so each feed names its generating script/workflow and stale feeds point to a specific recovery path.
Why it matters: Proof-feed publisher parity is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [PRODUCT] No-OG page triage
Final score: **84**
[SIL][SOCIAL/P3] No-OG page triage — check-og-images still reports 54 pages with no explicit og:image (warning only). Triage whether those pages should stay intentionally dark or receive generated cards.
Why it matters: No-OG page triage is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] INP root-fix
Final score: **81**
[PERF/P1] INP root-fix — when data/inp-breakdown.json has route samples, fix the dominant route/phase. Do NOT implement without field data.
Why it matters: INP root-fix is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] VideoGame JSON-LD field completeness
Final score: **78**
[SCHEMA/P2] VideoGame JSON-LD field completeness — add honest offers/applicationCategory/operatingSystem to individual game pages; source-derived from the game catalog, not fabricated.
Why it matters: VideoGame JSON-LD field completeness is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] Unique OG cards for duplicated social images
Final score: **75**
[SOCIAL/P2] Unique OG cards for duplicated social images — generate page-specific OG cards for leaderboard/member/game pages flagged by the advisory gate.
Why it matters: Unique OG cards for duplicated social images is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] VideoGame JSON-LD enrichment cleanup
Final score: **72**
[SCHEMA/P2] VideoGame JSON-LD enrichment cleanup — add honest offers / applicationCategory / operatingSystem where warnings identify missing fields; keep it source-derived, not fabricated.
Why it matters: VideoGame JSON-LD enrichment cleanup is open, local, and unblocked — can ship this session.

#### 3. [BRAND] Forge Window naming
Final score: **69**
[BRAND/FOUNDER] Forge Window naming — rename "Studio Pulse"→"Forge Window" across 108 public pages is a founder-gated public-vocabulary change (keep /studio-pulse/ URL for SEO). Needs sign-off on the public name.
Why it matters: Forge Window naming affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

## Recommended Build Order

1. INP root-fix when field data lands
2. Streaming-response double-clone audit
3. Post-push CI confirmation
4. OG-coverage observability
5. Proof-feed publisher parity
6. Forge Window naming propagation
7. No-OG page triage
8. INP root-fix
9. VideoGame JSON-LD field completeness
10. Unique OG cards for duplicated social images
11. VideoGame JSON-LD enrichment cleanup
12. Forge Window naming

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
