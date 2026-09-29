# Proof Surface Diagnostics

Generated: 2026-09-29T22:22:39.986Z
Receipt: `07664721e387bb31d8b7e08d` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 27.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 0.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 0.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 78 | blocking | 0.7s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 106 | advisory | 0.7s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 82 | blocking | 0.6s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 88 | blocking | 0.5s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 100 | advisory | 0.5s | 0 | `node scripts/build-oracle-feedback-themes.mjs --check` |
| 37 | blocking | 0.4s | 0 | `node scripts/build-news-desk.mjs --check` |
| 92 | blocking | 0.4s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 86 | blocking | 0.4s | 0 | `node scripts/check-franchise-interaction-attribution.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
