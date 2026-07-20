# Build Check Diagnostics

Generated: 2026-07-20T07:58:06.689Z

Latest: **218/218** passed · failed 0 · total 241.5s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 78 | 91.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 100 | 30.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 15.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 53 | 6.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 56 | 5.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 2 | 3.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 58 | 3.1s | 0 | `node scripts/validate-module-imports.mjs` |
| 203 | 2.4s | 0 | `node scripts/crawl-all-pages.mjs` |
| 89 | 2.3s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 184 | 2.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
