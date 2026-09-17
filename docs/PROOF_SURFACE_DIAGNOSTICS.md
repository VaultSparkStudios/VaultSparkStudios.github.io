# Proof Surface Diagnostics

Generated: 2026-09-17T07:57:47.664Z
Receipt: `93a61de4bb6d7c0a2e14076a` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 81.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 12.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 88 | blocking | 4.3s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 92 | blocking | 3.4s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 106 | advisory | 2.3s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 14 | blocking | 2.2s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 87 | blocking | 2.2s | 0 | `node scripts/check-receipt-ordering.mjs --self-test` |
| 107 | advisory | 2.1s | 0 | `node scripts/check-lighthouse-trend.mjs` |
| 82 | blocking | 1.7s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 101 | advisory | 1.5s | 0 | `node scripts/build-cta-state.mjs --check` |
| 98 | advisory | 1.5s | 0 | `node scripts/build-oracle-query-insights.mjs --check` |

## Failures

- None.
