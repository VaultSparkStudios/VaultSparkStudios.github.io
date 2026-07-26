# Build Check Diagnostics

Generated: 2026-07-26T18:42:21.807Z

Latest: **238/238** passed · failed 0 · total 108.7s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 86 | 33.2s | 0 | `node scripts/verify-supply-chain.mjs` |
| 108 | 10.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 9.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 61 | 3.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 64 | 3.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 2 | 2.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 194 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 223 | 1.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 234 | 1.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 101 | 0.9s | 0 | `node scripts/build-geo-vitals.mjs --check` |

## Failures

- None.
