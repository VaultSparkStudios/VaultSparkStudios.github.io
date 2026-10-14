# Proof Surface Diagnostics

Generated: 2026-10-14T00:57:02.643Z
Receipt: `28e7269c9a570d10eb28b8d5` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 29.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 1.0s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 0.9s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 106 | advisory | 0.9s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 37 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --check` |
| 49 | blocking | 0.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 0.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 35 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 38 | blocking | 0.7s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 92 | blocking | 0.6s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-schema-coverage.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
