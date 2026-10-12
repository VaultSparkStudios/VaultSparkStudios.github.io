# Proof Surface Diagnostics

Generated: 2026-10-12T05:47:02.026Z
Receipt: `b955609134a4902f54d299f0` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 20.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 0.8s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 49 | blocking | 0.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 78 | blocking | 0.7s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 0.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 0.5s | 0 | `node scripts/check-content-coherence.mjs` |
| 38 | blocking | 0.5s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 106 | advisory | 0.5s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 22 | blocking | 0.5s | 0 | `node scripts/check-schema-coverage.mjs` |
| 82 | blocking | 0.4s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 46 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- None.
