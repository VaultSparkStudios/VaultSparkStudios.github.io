# Proof Surface Diagnostics

Generated: 2026-10-14T00:28:42.237Z
Receipt: `5df17569bfcf9eaf0bcbe35c` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 34.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 6.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 88 | blocking | 1.0s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 1.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 0.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 106 | advisory | 0.7s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 35 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 38 | blocking | 0.6s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-schema-coverage.mjs` |
| 82 | blocking | 0.6s | 0 | `node scripts/build-route-consolidation.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
