# Build Check Diagnostics

Generated: 2026-08-23T08:02:30.526Z
Receipt: `7ece50845d9e530e0f771cc1` · coverage 368/368 from step 1

Latest: **368/368** passed · failed 0 · total 1028.6s
Concentration: **24.7%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 254.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 115.7s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 50.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 152 | 32.1s | 0 | `node scripts/inject-lqip.mjs --check` |
| 133 | 27.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 93 | 20.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 154 | 17.9s | 0 | `node scripts/inject-main-content-id.mjs --check` |
| 97 | 15.5s | 0 | `node scripts/lint-repo.mjs` |
| 96 | 11.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 29 | 8.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
