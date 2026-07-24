# Build Check Diagnostics

Generated: 2026-07-24T04:19:28.355Z

Latest: **218/218** passed · failed 0 · total 93.9s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 78 | 34.7s | 0 | `node scripts/verify-supply-chain.mjs` |
| 100 | 10.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 5.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 56 | 3.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 53 | 2.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 184 | 2.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 214 | 1.6s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 2 | 1.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 203 | 1.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 89 | 0.9s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |

## Failures

- None.
