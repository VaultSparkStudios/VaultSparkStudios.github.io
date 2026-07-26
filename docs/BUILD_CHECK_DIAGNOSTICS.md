# Build Check Diagnostics

Generated: 2026-07-26T08:00:34.329Z

Latest: **234/234** passed · failed 0 · total 156.6s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 84 | 58.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 106 | 23.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 27 | 10.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 62 | 3.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 59 | 3.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 1.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 190 | 1.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 95 | 1.2s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 65 | 1.1s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 219 | 1.0s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
