# Build Check Diagnostics

Generated: 2026-07-17T21:18:33.949Z

Latest: **218/218** passed · failed 0 · total 73.1s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 78 | 30.0s | 0 | `node scripts/verify-supply-chain.mjs` |
| 100 | 7.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 3.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 56 | 2.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 53 | 2.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 184 | 1.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 2 | 1.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 203 | 0.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 214 | 0.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 93 | 0.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |

## Failures

- None.
