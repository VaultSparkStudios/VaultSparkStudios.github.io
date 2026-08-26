# Build Check Diagnostics

Generated: 2026-08-26T07:39:19.252Z
Receipt: `8a69d8d3557dfb880bb78143` · coverage 370/370 from step 1

Latest: **370/370** passed · failed 0 · total 531.9s
Concentration: **17.5%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 92.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 49.6s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 43.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 93 | 16.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 96 | 14.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 29 | 13.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 133 | 9.3s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 117 | 6.6s | 0 | `node scripts/check-sri.mjs` |
| 58 | 6.5s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 97 | 5.9s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
