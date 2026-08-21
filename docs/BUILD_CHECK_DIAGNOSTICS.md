# Build Check Diagnostics

Generated: 2026-08-21T17:39:27.427Z
Receipt: `c6c11ee5b62ef4a40ef70e83` · coverage 368/368 from step 1

Latest: **368/368** passed · failed 0 · total 406.4s
Concentration: **19.0%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 77.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 36.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 15.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 29 | 14.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 93 | 9.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 96 | 7.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 133 | 4.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 23 | 3.9s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 244 | 3.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 256 | 3.6s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
