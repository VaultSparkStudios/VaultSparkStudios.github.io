# Proof Surface Diagnostics

Generated: 2026-10-23T01:49:54.486Z
Receipt: `4b5095f72c22d90beefd06e3` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 135.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 8.6s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 49 | blocking | 5.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 18 | blocking | 5.2s | 0 | `node scripts/check-videogame-schema.mjs` |
| 22 | blocking | 4.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 12 | blocking | 3.8s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 11 | blocking | 3.7s | 0 | `node scripts/check-og-images.mjs` |
| 106 | advisory | 3.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 35 | blocking | 3.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 61 | blocking | 2.6s | 0 | `node scripts/build-proposed-edges.mjs --check` |
| 82 | blocking | 2.6s | 0 | `node scripts/build-route-consolidation.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
