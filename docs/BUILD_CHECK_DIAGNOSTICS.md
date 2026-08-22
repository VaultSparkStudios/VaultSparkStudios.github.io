# Build Check Diagnostics

Generated: 2026-08-22T04:31:41.150Z
Receipt: `3cdeb1e9fcf8f6f89769410a` · coverage 368/368 from step 1

Latest: **368/368** passed · failed 0 · total 262.3s
Concentration: **14.5%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 37.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 27.5s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 24.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 29 | 9.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 96 | 5.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 93 | 4.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 23 | 4.5s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 58 | 4.3s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 133 | 4.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 244 | 3.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
