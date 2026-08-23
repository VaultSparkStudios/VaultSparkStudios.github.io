# Build Check Diagnostics

Generated: 2026-08-23T21:59:22.263Z
Receipt: `2c78b40adf49ef9f86ff2dd2` · coverage 368/368 from step 1

Latest: **368/368** passed · failed 0 · total 535.7s
Concentration: **20.4%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 109.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 68.0s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 29.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 93 | 8.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 8.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 96 | 8.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 235 | 6.2s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 133 | 5.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 244 | 5.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 294 | 5.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
