# Proof Surface Diagnostics

Generated: 2026-10-12T06:34:38.056Z
Receipt: `594c479890157513e0851e32` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 26.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 6.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 88 | blocking | 3.2s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 37 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 0.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 106 | advisory | 0.5s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 38 | blocking | 0.4s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 0.4s | 0 | `node scripts/check-content-coherence.mjs` |
| 90 | blocking | 0.4s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 35 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
