# Build Check Diagnostics

Generated: 2026-09-07T19:20:00.413Z
Receipt: `4e1c563336ed7b3e9c71124b` · coverage 390/390 from step 1

Latest: **390/390** passed · failed 0 · total 612.4s
Concentration: **14.9%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 91.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 52.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 375 | 40.2s | 0 | `node scripts/check-windows-hide.mjs` |
| 263 | 39.3s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 133 | 14.3s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 58 | 13.8s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 377 | 13.6s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 96 | 13.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 29 | 10.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 245 | 10.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
