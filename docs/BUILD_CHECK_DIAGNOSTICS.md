# Build Check Diagnostics

Generated: 2026-07-16T18:09:42.801Z

Latest: **213/213** passed · failed 0 · total 54.2s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 75 | 21.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 97 | 4.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 53 | 2.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 21 | 1.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 50 | 1.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 179 | 1.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 209 | 1.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 198 | 1.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 86 | 0.7s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 90 | 0.6s | 0 | `node scripts/build-geo-vitals.mjs --check` |

## Failures

- None.
