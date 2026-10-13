# Proof Surface Diagnostics

Generated: 2026-10-13T02:51:18.499Z
Receipt: `2eea6ebea517225c94f2e8dd` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 23.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 0.8s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 37 | blocking | 0.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 0.6s | 0 | `node scripts/check-content-coherence.mjs` |
| 78 | blocking | 0.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 38 | blocking | 0.6s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 82 | blocking | 0.5s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 106 | advisory | 0.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 11 | blocking | 0.4s | 0 | `node scripts/check-og-images.mjs` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-schema-coverage.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
