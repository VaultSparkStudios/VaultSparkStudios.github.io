# Build Check Diagnostics

Generated: 2026-08-14T09:29:42.544Z
Receipt: `adbeaf04b9692ba7fa4e4f19` · coverage 295/295 from step 1

Latest: **295/295** passed · failed 0 · total 173.6s
Concentration: **22.6%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 39.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 15.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 253 | 10.6s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 28 | 5.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 90 | 4.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 87 | 3.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 121 | 2.4s | 0 | `node scripts/check-ambient-placement.mjs` |
| 52 | 2.2s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 236 | 2.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 119 | 2.0s | 0 | `node scripts/check-mobile-contracts.mjs` |

## Failures

- None.
