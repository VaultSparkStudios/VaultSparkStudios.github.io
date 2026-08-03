# Build Check Diagnostics

Generated: 2026-08-03T02:49:50.135Z
Receipt: `3232aa59a889f24a8e4438cf` · coverage 269/269 from step 1

Latest: **269/269** passed · failed 0 · total 400.5s
Concentration: **19.1%** in step 122 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 122 | 76.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 43 | 59.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 75 | 18.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 16 | 9.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 78 | 5.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 4.7s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 249 | 3.7s | 0 | `node scripts/crawl-all-pages.mjs` |
| 47 | 3.6s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 100 | 3.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 81 | 3.0s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |

## Failures

- None.
