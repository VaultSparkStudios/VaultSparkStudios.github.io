# Build Check Diagnostics

Generated: 2026-08-23T19:16:42.692Z
Receipt: `9fdca30d2ea6cc374e8f17c9` · coverage 368/368 from step 1

Latest: **368/368** passed · failed 0 · total 521.2s
Concentration: **17.4%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 90.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 71.7s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 26.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 8.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 333 | 8.5s | 0 | `node scripts/check-hardfail-resilience.mjs` |
| 256 | 7.4s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 93 | 7.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 235 | 6.2s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 29 | 4.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 244 | 4.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
