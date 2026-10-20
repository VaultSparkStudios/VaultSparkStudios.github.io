# Proof Surface Diagnostics

Generated: 2026-10-20T17:13:27.731Z
Receipt: `d04e23b48e741e932af47f5e` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 119.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 7.2s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 22 | blocking | 6.1s | 0 | `node scripts/check-schema-coverage.mjs` |
| 38 | blocking | 4.7s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 4.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 46 | blocking | 4.2s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 92 | blocking | 3.9s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 78 | blocking | 3.3s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 36 | blocking | 2.8s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 35 | blocking | 2.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 106 | advisory | 2.5s | 1 | `node scripts/generate-build-sha.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
