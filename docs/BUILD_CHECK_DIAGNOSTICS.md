# Build Check Diagnostics

Generated: 2026-08-24T11:28:24.141Z
Receipt: `5200e9409e6499d4bacf75dc` · coverage 370/370 from step 1

Latest: **370/370** passed · failed 0 · total 243.7s
Concentration: **16.7%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 40.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 31.8s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 17.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 7.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 93 | 5.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 3.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 244 | 3.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 133 | 3.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 235 | 2.3s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 256 | 2.1s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
