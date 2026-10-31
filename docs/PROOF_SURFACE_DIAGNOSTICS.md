# Proof Surface Diagnostics

Generated: 2026-10-31T01:02:40.967Z
Receipt: `814d5bfe6453f7f7f1873c20` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 45.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 106 | advisory | 2.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 49 | blocking | 1.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.4s | 0 | `node scripts/check-content-coherence.mjs` |
| 78 | blocking | 1.3s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 35 | blocking | 1.2s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 37 | blocking | 1.1s | 0 | `node scripts/build-news-desk.mjs --check` |
| 82 | blocking | 1.1s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 22 | blocking | 1.0s | 0 | `node scripts/check-schema-coverage.mjs` |
| 38 | blocking | 0.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 87 | blocking | 0.7s | 0 | `node scripts/check-receipt-ordering.mjs --self-test` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
