# Build Check Diagnostics

Generated: 2026-07-26T22:45:51.566Z

Latest: **241/241** passed · failed 0 · total 145.8s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 86 | 58.8s | 0 | `node scripts/verify-supply-chain.mjs` |
| 108 | 13.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 8.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 61 | 4.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 64 | 3.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 2 | 1.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 197 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 67 | 1.6s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 226 | 1.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 156 | 1.1s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |

## Failures

- None.
