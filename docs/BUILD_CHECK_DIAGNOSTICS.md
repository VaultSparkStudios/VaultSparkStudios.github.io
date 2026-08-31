# Build Check Diagnostics

Generated: 2026-08-31T07:20:11.855Z
Receipt: `9aaae952c2c7c2e43083635b` · coverage 371/371 from step 1

Latest: **371/371** passed · failed 0 · total 540.1s
Concentration: **13.9%** in step 262 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 262 | 74.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 140 | 74.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 46.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 29 | 10.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 96 | 7.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 93 | 6.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 358 | 6.3s | 0 | `node scripts/check-mobile-runtime-contract.mjs` |
| 66 | 5.9s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 350 | 5.7s | 0 | `node scripts/check-static-csp-routes.mjs` |
| 58 | 5.6s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- None.
