# Build Check Diagnostics

Generated: 2026-07-16T21:14:09.390Z

Latest: **214/214** passed · failed 0 · total 53.5s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 75 | 20.6s | 0 | `node scripts/verify-supply-chain.mjs` |
| 97 | 5.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 53 | 2.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 21 | 1.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 50 | 1.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 180 | 1.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 199 | 0.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 2 | 0.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 144 | 0.6s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |
| 86 | 0.5s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |

## Failures

- None.
