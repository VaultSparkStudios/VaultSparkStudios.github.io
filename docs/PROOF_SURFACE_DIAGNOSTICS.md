# Proof Surface Diagnostics

Generated: 2026-10-15T18:24:33.094Z
Receipt: `a181390eec14743e3c79fefb` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 15.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 88 | blocking | 0.8s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 0.7s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 0.5s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 0.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 0.4s | 0 | `node scripts/check-content-coherence.mjs` |
| 106 | advisory | 0.3s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 35 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 0.3s | 0 | `node scripts/check-schema-coverage.mjs` |
| 46 | blocking | 0.2s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- None.
