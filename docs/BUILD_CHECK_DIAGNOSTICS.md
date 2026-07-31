# Build Check Diagnostics

Generated: 2026-07-31T08:53:28.258Z
Receipt: `d2bda907f51cb3d35e3f7362` · coverage 261/261 from step 1

Latest: **261/261** passed · failed 0 · total 187.7s
Concentration: **16.2%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 30.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 26.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 9.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 11 | 5.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 73 | 3.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 95 | 3.5s | 0 | `node scripts/verify-supply-chain.mjs` |
| 210 | 2.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 42 | 2.0s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 242 | 1.8s | 0 | `node scripts/crawl-all-pages.mjs` |
| 76 | 1.5s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |

## Failures

- None.
