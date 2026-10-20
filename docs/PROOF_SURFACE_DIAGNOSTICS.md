# Proof Surface Diagnostics

Generated: 2026-10-20T06:49:25.252Z
Receipt: `396d9fe02ea15f10e5877dd2` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 59.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 35 | blocking | 1.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 49 | blocking | 1.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 1.3s | 0 | `node scripts/check-schema-coverage.mjs` |
| 84 | blocking | 1.2s | 0 | `node scripts/check-cache-evidence-classification.mjs` |
| 37 | blocking | 1.1s | 0 | `node scripts/build-news-desk.mjs --check` |
| 95 | advisory | 1.1s | 0 | `node scripts/check-public-note-freshness.mjs --self-test` |
| 106 | advisory | 1.1s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 78 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 65 | blocking | 1.0s | 0 | `node scripts/check-content-coherence.mjs` |
| 82 | blocking | 1.0s | 0 | `node scripts/build-route-consolidation.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
