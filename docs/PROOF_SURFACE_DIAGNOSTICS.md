# Proof Surface Diagnostics

Generated: 2026-08-27T23:02:44.047Z
Receipt: `64665ac1ab5420d07dcd8781` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 267.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 12.3s | 0 | `node scripts/check-og-images.mjs` |
| 35 | blocking | 8.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 12 | blocking | 8.5s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 86 | blocking | 6.7s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 66 | blocking | 5.3s | 0 | `node scripts/check-worker-rewriter-safety.mjs --self-test` |
| 33 | blocking | 5.2s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 16 | blocking | 5.2s | 0 | `node scripts/check-videogame-schema.mjs` |
| 42 | blocking | 5.1s | 0 | `node scripts/build-velocity-series.mjs --check` |
| 76 | blocking | 4.7s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 90 | blocking | 4.5s | 0 | `node scripts/generate-sitemap.mjs --check` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
