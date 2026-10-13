# Proof Surface Diagnostics

Generated: 2026-10-13T00:30:24.504Z
Receipt: `38f66c6a3792f00978bfabd6` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 43.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 8.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 88 | blocking | 3.9s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 46 | blocking | 3.1s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 22 | blocking | 3.0s | 0 | `node scripts/check-schema-coverage.mjs` |
| 78 | blocking | 0.9s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 65 | blocking | 0.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 37 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 15 | blocking | 0.8s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |
| 106 | advisory | 0.7s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 38 | blocking | 0.7s | 0 | `node scripts/generate-news-pages.mjs --check` |

## Failures

- None.
