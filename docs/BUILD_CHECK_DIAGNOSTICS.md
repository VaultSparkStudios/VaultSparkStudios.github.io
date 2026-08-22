# Build Check Diagnostics

Generated: 2026-08-22T04:47:01.660Z
Receipt: `e3dbd8b0c9629e04630fc7aa` · coverage 368/368 from step 1

Latest: **368/368** passed · failed 0 · total 206.7s
Concentration: **15.8%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 32.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 31.8s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 14.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 5.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 93 | 4.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 244 | 3.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 2.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 133 | 2.6s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 256 | 2.5s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 235 | 2.3s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |

## Failures

- None.
