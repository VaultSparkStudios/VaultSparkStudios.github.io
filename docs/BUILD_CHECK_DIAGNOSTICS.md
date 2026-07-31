# Build Check Diagnostics

Generated: 2026-07-31T21:16:14.799Z
Receipt: `e3cc084d64c776f9467579ca` · coverage 262/262 from step 1

Latest: **262/262** passed · failed 0 · total 282.1s
Concentration: **19.2%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 54.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 41.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 10.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 11 | 9.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 73 | 3.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 76 | 2.7s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 95 | 2.6s | 0 | `node scripts/verify-supply-chain.mjs` |
| 210 | 2.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 42 | 2.1s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 242 | 1.9s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
