# Proof Surface Diagnostics

Generated: 2026-10-13T23:13:45.724Z
Receipt: `0f772c477f568ae0db37e49a` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 32.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 1.9s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 1.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 37 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 0.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 92 | blocking | 0.8s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 35 | blocking | 0.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 38 | blocking | 0.7s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 22 | blocking | 0.7s | 0 | `node scripts/check-schema-coverage.mjs` |
| 106 | advisory | 0.7s | 1 | `node scripts/generate-build-sha.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
