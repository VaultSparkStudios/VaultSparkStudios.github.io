# Proof Surface Diagnostics

Generated: 2026-11-17T04:38:08.466Z
Receipt: `cec847c192c0ae21c4e8650c` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 81.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 6.6s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 6.5s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 3.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 3.7s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 3.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 3.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 92 | blocking | 3.0s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 22 | blocking | 2.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 35 | blocking | 2.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 90 | blocking | 2.7s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
