# Build Check Diagnostics

Generated: 2026-08-03T03:04:26.315Z
Receipt: `f116d436bfb2b6ebc2485e72` · coverage 269/269 from step 1

Latest: **269/269** passed · failed 0 · total 400.4s
Concentration: **12.7%** in step 43 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 43 | 50.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 122 | 47.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 75 | 18.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 16 | 14.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 11 | 4.8s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 78 | 4.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 100 | 3.8s | 0 | `node scripts/verify-supply-chain.mjs` |
| 249 | 3.7s | 0 | `node scripts/crawl-all-pages.mjs` |
| 81 | 3.1s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 74 | 3.0s | 0 | `node scripts/generate-founder-presence.mjs --check` |

## Failures

- None.
