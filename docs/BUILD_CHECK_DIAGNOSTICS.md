# Build Check Diagnostics

Generated: 2026-08-31T02:49:37.811Z
Receipt: `0bb8a843bf90dca87eb280d0` · coverage 371/371 from step 1

Latest: **371/371** passed · failed 0 · total 1130.9s
Concentration: **18.4%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 207.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 262 | 176.7s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 47.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 81 | 21.9s | 0 | `node scripts/check-s151-contracts.mjs` |
| 29 | 21.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 93 | 18.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 133 | 17.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 239 | 14.8s | 0 | `node scripts/check-placeholder-orphans.mjs` |
| 170 | 12.8s | 0 | `node scripts/build-ship-receipts.mjs --check` |
| 235 | 12.2s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |

## Failures

- None.
