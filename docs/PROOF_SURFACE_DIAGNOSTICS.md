# Proof Surface Diagnostics

Generated: 2026-10-26T23:28:27.301Z
Receipt: `0b1908c89c007db92db6ad42` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 55.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 82 | blocking | 2.5s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 49 | blocking | 2.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 81 | blocking | 1.9s | 0 | `node scripts/build-route-consolidation.mjs --self-test` |
| 22 | blocking | 1.8s | 0 | `node scripts/check-schema-coverage.mjs` |
| 24 | blocking | 1.8s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 88 | blocking | 1.4s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 35 | blocking | 1.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 106 | advisory | 1.3s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 79 | blocking | 1.3s | 0 | `node scripts/build-projects-catalog.mjs --self-test` |
| 65 | blocking | 1.2s | 0 | `node scripts/check-content-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
