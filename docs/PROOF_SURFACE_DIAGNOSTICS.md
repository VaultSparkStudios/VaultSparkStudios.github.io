# Proof Surface Diagnostics

Generated: 2026-10-14T23:48:37.860Z
Receipt: `fd98a7ff9691e349895b1131` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 27.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 43 | blocking | 1.9s | 0 | `node scripts/build-velocity-series.mjs --self-test` |
| 88 | blocking | 1.6s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 1.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 22 | blocking | 1.3s | 0 | `node scripts/check-schema-coverage.mjs` |
| 37 | blocking | 1.2s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 1.2s | 0 | `node scripts/check-content-coherence.mjs` |
| 92 | blocking | 1.0s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 38 | blocking | 0.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 0.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 0.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
