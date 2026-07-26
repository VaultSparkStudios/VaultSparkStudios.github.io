# Build Check Diagnostics

Generated: 2026-07-26T18:53:33.859Z

Latest: **238/238** passed · failed 0 · total 90.3s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 86 | 27.6s | 0 | `node scripts/verify-supply-chain.mjs` |
| 108 | 10.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 7.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 64 | 2.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 2.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 194 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 2 | 1.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 234 | 1.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 223 | 0.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 101 | 0.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |

## Failures

- None.
