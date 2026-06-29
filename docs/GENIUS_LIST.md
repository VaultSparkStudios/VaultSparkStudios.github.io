# Genius Hit List — Session 235

Generated: 2026-06-29
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **78/100**
- Health: **green**
- Current SIL: **994/500**
- CI health: **all-green ✓**
- Current focus: S235 full /arc completed: shipped Oracle Answer API (deploy-time source-backed corpus + agent lookup), /membership-value/ interactive value calculator, startup-brief truth fixes, Oracle answer quality gate, LLM discovery spine, Worker RUM allowlist repair, and production Worker deploy for agent-friendly public reads. Full npm run build + npm run build:check green; browser sanity check passed; live curl/python-requests edge smoke returned 200.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] INP root-fix
Final score: **96**
[PERF/P1] INP root-fix — when data/inp-breakdown.json has route samples, fix the dominant route/handler/phase. Do not guess before data lands.
Why it matters: INP root-fix is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] VideoGame JSON-LD enrichment cleanup
Final score: **93**
[SCHEMA/P2] VideoGame JSON-LD enrichment cleanup — add honest offers / applicationCategory / operatingSystem where warnings identify missing fields; keep it source-derived, not fabricated.
Why it matters: VideoGame JSON-LD enrichment cleanup is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Unique OG cards for duplicated social images
Final score: **90**
[SOCIAL/P2] Unique OG cards for duplicated social images — build/generate page-specific cards for leaderboard/member/game duplicates flagged by build:check advisory output.
Why it matters: Unique OG cards for duplicated social images is open, local, and unblocked — can ship this session.

#### 4. [BRAND] Forge Window naming
Final score: **87**
[BRAND/FOUNDER] Forge Window naming — rename "Studio Pulse"→"Forge Window" across 108 public pages is a founder-gated public-vocabulary change (keep /studio-pulse/ URL for SEO). Needs sign-off on the public name.
Why it matters: Forge Window naming affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [PRODUCT] Generalize the blockDays trust-ceiling
Final score: **84**
[INFRA/P2] Generalize the blockDays trust-ceiling — extend the expire-don't-warn blocking pattern to other public-trust surfaces that currently only warn (status-proof feeds, uptime publish age). One blocking ceiling per visitor-noticeable surface.
Why it matters: Generalize the blockDays trust-ceiling is open, local, and unblocked — can ship this session.

#### 3. [BRAND] Changelog publish
Final score: **78**
[PRODUCT/P1] Changelog publish — review context/changelog-drafts/2026-06-27.md and promote to changelog/index.html (founder voice).
Why it matters: Changelog publish affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 4. [VERIFY] E2E full verify
Final score: **71**
[CI/P2] E2E full verify — confirm E2E suite green post-LQIP fix (CI run needed).
Why it matters: E2E full verify is a 235-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [VERIFY] Verify Lighthouse homepage ≥0.80
Final score: **65**
[CI/P1] Verify Lighthouse homepage ≥0.80 — defer→idle (43KB) + outputDir fix (gate now sees LHR data). Watch next CI Lighthouse run.
Why it matters: Verify Lighthouse homepage ≥0.80 is a 235-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [VERIFY] Verify E2E green
Final score: **62**
[CI/P1] Verify E2E green — networkidle mass-fix from S224. Confirm first green E2E run.
Why it matters: Verify E2E green is a 235-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [PRODUCT] workflow cache-dependency lint. Generalize check-workflow-install-con…
Final score: **60**
[INFRA/P3·SIL] workflow cache-dependency lint. Generalize check-workflow-install-consistency to flag any actions/setup-node cache: without a committed lockfile present (not just the literal cache: 'npm').
Why it matters: workflow cache-dependency lint. Generalize check-workflow-install-cons is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Lighthouse trend auto-update in CI
Final score: **59**
[INFRA/P3] Lighthouse trend auto-update in CI — push updated .cache/lighthouse-trend.json back to repo after each CI Lighthouse run (CI step + PAT). Ledger currently only grows locally; cross-session trend is invisible in CI.
Why it matters: Lighthouse trend auto-update in CI is a 235-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

## Recommended Build Order

1. INP root-fix
2. VideoGame JSON-LD enrichment cleanup
3. Unique OG cards for duplicated social images
4. Forge Window naming
5. Forge Window naming propagation
6. Generalize the blockDays trust-ceiling
7. Changelog publish
8. E2E full verify
9. Verify Lighthouse homepage ≥0.80
10. Verify E2E green
11. workflow cache-dependency lint. Generalize check-workflow-install-con…
12. Lighthouse trend auto-update in CI

## Best Immediate Move

CI is all-green. Focus on the top unblocked implementation item above, then rerun this generator after shipping.
