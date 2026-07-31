# Build Check Diagnostics

Generated: 2026-07-31T09:02:30.809Z
Receipt: `cf03aba745bb36edc77a3e25` · coverage 262/262 from step 1

Latest: **262/262** passed · failed 0 · total 129.3s
Concentration: **16.8%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 21.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 14.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 5.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 11 | 4.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 73 | 3.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 95 | 2.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 242 | 2.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 210 | 1.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 76 | 1.3s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 43 | 1.1s | 0 | `node scripts/build-shell-assets.mjs --check` |

## Failures

- None.
