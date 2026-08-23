# Build Check Diagnostics

Generated: 2026-08-23T17:41:34.891Z
Receipt: `63cee2a5b22d05dc3d5026a4` · coverage 368/368 from step 1

Latest: **368/368** passed · failed 0 · total 406.8s
Concentration: **15.5%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 63.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 48.6s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 24.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 8.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 93 | 7.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 256 | 6.7s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 133 | 6.6s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 239 | 5.2s | 0 | `node scripts/check-placeholder-orphans.mjs` |
| 29 | 5.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 244 | 5.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
