# Proof Surface Diagnostics

Generated: 2026-09-07T05:22:51.128Z
Receipt: `2b9c3f0af13f33baab169fbb` · coverage 107/107

Latest: **105/107** passed · blocking 90/90 · advisory findings 2/17 · total 33.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 0.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 104 | advisory | 0.7s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 100 | advisory | 0.5s | 0 | `node scripts/build-hero-portfolio.mjs --check` |
| 32 | blocking | 0.5s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs --self-test` |
| 44 | blocking | 0.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 33 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 76 | blocking | 0.5s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 80 | blocking | 0.5s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 35 | blocking | 0.4s | 0 | `node scripts/build-news-desk.mjs --check` |
| 16 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
