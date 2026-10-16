# Proof Surface Diagnostics

Generated: 2026-10-16T02:29:57.591Z
Receipt: `99b0708d9ce6d4339bd792fb` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 20.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 1.3s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 1.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 0.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 88 | blocking | 0.8s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 38 | blocking | 0.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-schema-coverage.mjs` |
| 49 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 46 | blocking | 0.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 92 | blocking | 0.4s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 35 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
