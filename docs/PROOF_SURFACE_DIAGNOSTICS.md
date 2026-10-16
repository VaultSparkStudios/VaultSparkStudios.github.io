# Proof Surface Diagnostics

Generated: 2026-10-16T04:18:02.030Z
Receipt: `a410b28907e83fb88f591448` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 27.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 1.4s | 0 | `node scripts/build-news-desk.mjs --check` |
| 88 | blocking | 1.3s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 1.3s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 0.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 38 | blocking | 0.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 22 | blocking | 0.8s | 0 | `node scripts/check-schema-coverage.mjs` |
| 11 | blocking | 0.6s | 0 | `node scripts/check-og-images.mjs` |
| 106 | advisory | 0.6s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 35 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 36 | blocking | 0.5s | 0 | `node scripts/build-news-desk.mjs --self-test` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
