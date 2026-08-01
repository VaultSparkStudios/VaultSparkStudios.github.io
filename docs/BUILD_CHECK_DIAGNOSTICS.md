# Build Check Diagnostics

Generated: 2026-08-01T07:33:48.270Z
Receipt: `63db6d39f12f88c5154f4d6c` · coverage 267/267 from step 1

Latest: **267/267** passed · failed 0 · total 242.0s
Concentration: **13.8%** in step 43 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 43 | 33.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 122 | 30.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 16 | 10.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 75 | 9.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 78 | 4.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 247 | 3.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 11 | 3.7s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 215 | 3.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 81 | 3.2s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 100 | 2.4s | 0 | `node scripts/verify-supply-chain.mjs` |

## Failures

- None.
