# Proof Surface Diagnostics

Generated: 2026-10-10T15:45:12.891Z
Receipt: `b4ca5d9ccb6062de33fcd6db` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 40.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 22 | blocking | 5.2s | 0 | `node scripts/check-schema-coverage.mjs` |
| 88 | blocking | 4.7s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 46 | blocking | 4.1s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 18 | blocking | 1.5s | 0 | `node scripts/check-videogame-schema.mjs` |
| 15 | blocking | 1.0s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |
| 37 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --check` |
| 106 | advisory | 0.8s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 78 | blocking | 0.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 0.7s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 0.7s | 0 | `node scripts/check-content-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
