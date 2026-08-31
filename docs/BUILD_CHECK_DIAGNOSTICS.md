# Build Check Diagnostics

Generated: 2026-08-31T07:48:47.627Z
Receipt: `4fd8f24d69b3c98e07d0f57e` · coverage 371/371 from step 1

Latest: **371/371** passed · failed 0 · total 522.2s
Concentration: **14.7%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 76.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 58.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 262 | 57.3s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 93 | 15.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 364 | 10.4s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 96 | 9.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 256 | 7.4s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 29 | 6.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 244 | 6.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 133 | 5.4s | 0 | `node scripts/build-geo-vitals.mjs --check` |

## Failures

- None.
