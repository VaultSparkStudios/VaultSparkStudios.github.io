# Proof Surface Diagnostics

Generated: 2026-09-03T05:03:14.790Z
Receipt: `b8e47356d01e5e272a098d92` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 63.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 90 | blocking | 3.0s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 86 | blocking | 2.8s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 76 | blocking | 2.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 33 | blocking | 1.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 9 | blocking | 1.4s | 0 | `node scripts/check-og-images.mjs` |
| 96 | advisory | 1.2s | 0 | `node scripts/build-oracle-query-insights.mjs --check` |
| 104 | advisory | 1.1s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 85 | blocking | 1.0s | 0 | `node scripts/check-receipt-ordering.mjs --self-test` |
| 47 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 82 | blocking | 1.0s | 0 | `node scripts/check-cache-evidence-classification.mjs` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
