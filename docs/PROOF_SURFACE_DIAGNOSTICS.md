# Proof Surface Diagnostics

Generated: 2026-10-22T20:46:08.194Z
Receipt: `0f78bb6f0f2201a8611c334d` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 120.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 5.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 4.0s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 88 | blocking | 3.4s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 65 | blocking | 3.4s | 0 | `node scripts/check-content-coherence.mjs` |
| 82 | blocking | 3.0s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 22 | blocking | 2.7s | 0 | `node scripts/check-schema-coverage.mjs` |
| 86 | blocking | 1.9s | 0 | `node scripts/check-franchise-interaction-attribution.mjs` |
| 105 | advisory | 1.8s | 0 | `node scripts/check-nav-catalog-sync.mjs` |
| 87 | blocking | 1.8s | 0 | `node scripts/check-receipt-ordering.mjs --self-test` |
| 109 | advisory | 1.6s | 0 | `node scripts/build-release-dependencies.mjs --check` |

## Failures

- None.
