# Proof Surface Diagnostics

Generated: 2026-10-23T07:30:38.817Z
Receipt: `307c4be15ee8f4ae5e613697` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 61.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 106 | advisory | 2.5s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 49 | blocking | 2.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 22 | blocking | 1.7s | 0 | `node scripts/check-schema-coverage.mjs` |
| 94 | advisory | 1.6s | 0 | `node scripts/check-dead-ctas.mjs --check` |
| 101 | advisory | 1.5s | 0 | `node scripts/build-cta-state.mjs --check` |
| 37 | blocking | 1.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 35 | blocking | 1.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 78 | blocking | 1.3s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 88 | blocking | 1.2s | 0 | `node scripts/check-receipt-ordering.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
