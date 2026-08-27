# Build Check Diagnostics

Generated: 2026-08-27T10:44:40.674Z
Receipt: `69c0dace45b28f1e7793d4b6` · coverage 370/370 from step 1

Latest: **370/370** passed · failed 0 · total 313.6s
Concentration: **19.0%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 59.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 46.4s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 21.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 7.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 93 | 6.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 4.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 244 | 4.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 235 | 3.3s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 256 | 3.2s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 23 | 2.6s | 0 | `node scripts/check-capability-discovery-contract.mjs` |

## Failures

- None.
