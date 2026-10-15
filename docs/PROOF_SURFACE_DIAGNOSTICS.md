# Proof Surface Diagnostics

Generated: 2026-10-15T14:39:57.231Z
Receipt: `8a717b3d1b15016c4c5236e8` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 19.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 1.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 1.1s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 1.0s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 0.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 22 | blocking | 0.7s | 0 | `node scripts/check-schema-coverage.mjs` |
| 49 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 92 | blocking | 0.6s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 46 | blocking | 0.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 35 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 82 | blocking | 0.4s | 0 | `node scripts/build-route-consolidation.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
