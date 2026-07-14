# Build Check Diagnostics

Generated: 2026-07-14T08:29:02.032Z

Latest: **204/204** passed · failed 0 · total 189.4s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 92 | 49.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 71 | 32.6s | 0 | `node scripts/verify-supply-chain.mjs` |
| 21 | 8.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 46 | 6.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 202 | 4.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 2 | 3.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 49 | 2.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 172 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 191 | 1.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 85 | 1.3s | 0 | `node scripts/build-geo-vitals.mjs --check` |

## Failures

- None.
