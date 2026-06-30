# Genius Hit List — Session 238

Generated: 2026-06-30
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **81/100**
- Health: **green**
- Current SIL: **997/500**
- CI health: **all-green ✓**
- Current focus: S238 full /arc completed: No-OG page triage shipped 12 bespoke share cards for the studio's highest-intent public pages (pathways, Solara, membership-value, feedback) and classified the other 42 card-less pages as intentionally-dark, so the share-card gate now errors on any new card-less public page instead of emitting an ambient warning. Every public trust feed now declares its generator + exact recovery command + workflow (api/feed-publishers.json, agent-discoverable in agents.json), with a one-command --recover-stale mode closing the dead-cron loop. INP root-fix remains honestly data-blocked (0 samples). npm run build EXIT 0; npm run build:check EXIT 0.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] INP root-fix when field data lands
Final score: **96**
[SIL][PERF/P1] INP root-fix when field data lands — when data/inp-breakdown.json has real route samples, fix the dominant route/handler/phase and update the evidence chain.
Why it matters: INP root-fix when field data lands is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] OG-coverage observability
Final score: **93**
[SIL][AI/DISCOVERY] OG-coverage observability — consider emitting OG-card coverage (carded vs intentionally-dark vs total) as a small tracked metric so triage state is observable over time, not just a build-time count.
Why it matters: OG-coverage observability is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Proof-feed publisher parity
Final score: **90**
[SIL][INFRA/P2] Proof-feed publisher parity — now that freshness ceilings cover 11 feeds, add a small publisher inventory/check so each feed names its generating script/workflow and stale feeds point to a specific recovery path.
Why it matters: Proof-feed publisher parity is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] No-OG page triage
Final score: **87**
[SIL][SOCIAL/P3] No-OG page triage — check-og-images still reports 54 pages with no explicit og:image (warning only). Triage whether those pages should stay intentionally dark or receive generated cards.
Why it matters: No-OG page triage is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [PRODUCT] INP root-fix
Final score: **84**
[PERF/P1] INP root-fix — when data/inp-breakdown.json has route samples, fix the dominant route/phase. Do NOT implement without field data.
Why it matters: INP root-fix is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] VideoGame JSON-LD field completeness
Final score: **81**
[SCHEMA/P2] VideoGame JSON-LD field completeness — add honest offers/applicationCategory/operatingSystem to individual game pages; source-derived from the game catalog, not fabricated.
Why it matters: VideoGame JSON-LD field completeness is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Unique OG cards for duplicated social images
Final score: **78**
[SOCIAL/P2] Unique OG cards for duplicated social images — generate page-specific OG cards for leaderboard/member/game pages flagged by the advisory gate.
Why it matters: Unique OG cards for duplicated social images is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] VideoGame JSON-LD enrichment cleanup
Final score: **75**
[SCHEMA/P2] VideoGame JSON-LD enrichment cleanup — add honest offers / applicationCategory / operatingSystem where warnings identify missing fields; keep it source-derived, not fabricated.
Why it matters: VideoGame JSON-LD enrichment cleanup is open, local, and unblocked — can ship this session.

### LATER

#### 1. [BRAND] Forge Window naming
Final score: **72**
[BRAND/FOUNDER] Forge Window naming — rename "Studio Pulse"→"Forge Window" across 108 public pages is a founder-gated public-vocabulary change (keep /studio-pulse/ URL for SEO). Needs sign-off on the public name.
Why it matters: Forge Window naming affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [PRODUCT] Generalize the blockDays trust-ceiling
Final score: **69**
[INFRA/P2] Generalize the blockDays trust-ceiling — extend the expire-don't-warn blocking pattern to other public-trust surfaces that currently only warn (status-proof feeds, uptime publish age). One blocking ceiling per visitor-noticeable surface.
Why it matters: Generalize the blockDays trust-ceiling is open, local, and unblocked — can ship this session.

#### 3. [BRAND] Changelog publish
Final score: **63**
[PRODUCT/P1] Changelog publish — review context/changelog-drafts/2026-06-27.md and promote to changelog/index.html (founder voice).
Why it matters: Changelog publish affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

## Recommended Build Order

1. INP root-fix when field data lands
2. OG-coverage observability
3. Proof-feed publisher parity
4. No-OG page triage
5. Forge Window naming propagation
6. INP root-fix
7. VideoGame JSON-LD field completeness
8. Unique OG cards for duplicated social images
9. VideoGame JSON-LD enrichment cleanup
10. Forge Window naming
11. Generalize the blockDays trust-ceiling
12. Changelog publish

## Best Immediate Move

CI is all-green. Focus on the top unblocked implementation item above, then rerun this generator after shipping.
