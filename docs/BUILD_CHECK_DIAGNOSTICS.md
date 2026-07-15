# Build Check Diagnostics

Generated: 2026-07-15T02:54:41.907Z

Latest: **207/207** passed · failed 0 · total 134.3s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 93 | 24.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 71 | 20.5s | 0 | `node scripts/verify-supply-chain.mjs` |
| 2 | 8.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 21 | 8.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 46 | 5.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 49 | 2.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 175 | 1.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 205 | 1.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 194 | 1.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 9 | 1.0s | 0 | `node scripts/rollup-rum.mjs --self-test` |

## Failures

- None.
