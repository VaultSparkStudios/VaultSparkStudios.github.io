# Build Check Diagnostics

Generated: 2026-07-15T03:11:23.107Z

Latest: **207/207** passed · failed 0 · total 112.2s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 71 | 19.5s | 0 | `node scripts/verify-supply-chain.mjs` |
| 93 | 18.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 8.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 46 | 4.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 3.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 49 | 2.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 175 | 1.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 205 | 1.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 194 | 1.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 25 | 1.2s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
