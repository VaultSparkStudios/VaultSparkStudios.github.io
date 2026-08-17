# Build Check Diagnostics

Generated: 2026-08-17T17:19:56.330Z
Receipt: `98181bc2d9d0d43b33dac445` · coverage 309/309 from step 1

Latest: **309/309** passed · failed 0 · total 287.8s
Concentration: **18.3%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 52.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 253 | 31.8s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 55 | 31.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 87 | 7.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 90 | 5.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 28 | 4.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 59 | 3.4s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 57 | 3.3s | 0 | `node scripts/check-lighthouse-route-tiers.mjs` |
| 227 | 3.2s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 236 | 2.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
