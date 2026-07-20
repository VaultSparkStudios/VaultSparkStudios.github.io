# Build Check Diagnostics

Generated: 2026-07-20T17:40:33.699Z

Latest: **218/218** passed · failed 0 · total 91.1s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 78 | 37.7s | 0 | `node scripts/verify-supply-chain.mjs` |
| 100 | 8.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 5.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 56 | 2.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 53 | 2.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 184 | 1.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 2 | 1.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 214 | 0.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 203 | 0.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 93 | 0.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |

## Failures

- None.
