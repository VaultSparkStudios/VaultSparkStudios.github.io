# Proof Surface Diagnostics

Generated: 2026-10-20T09:21:15.134Z
Receipt: `9e749f00705ee0428875d3cf` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 29.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 1.0s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 49 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 37 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 0.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 65 | blocking | 0.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 106 | advisory | 0.7s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 38 | blocking | 0.6s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 82 | blocking | 0.5s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 24 | blocking | 0.5s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 22 | blocking | 0.5s | 0 | `node scripts/check-schema-coverage.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
