# Build Check Diagnostics

Generated: 2026-07-20T17:55:21.231Z

Latest: **218/218** passed · failed 0 · total 90.2s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 78 | 38.0s | 0 | `node scripts/verify-supply-chain.mjs` |
| 100 | 8.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 5.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 56 | 2.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 53 | 2.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 184 | 1.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 2 | 1.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 203 | 0.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 214 | 0.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 93 | 0.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |

## Failures

- None.
