# Build Check Diagnostics

Generated: 2026-07-10T17:12:10.212Z

Latest: **186/186** passed · failed 0 · total 102.2s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 64 | 21.1s | 0 | `node scripts/verify-supply-chain.mjs` |
| 83 | 18.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 22 | 8.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 41 | 4.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 2.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 44 | 2.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 173 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 26 | 1.0s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 70 | 0.8s | 0 | `node scripts/check-ambient-placement.mjs --self-test` |
| 184 | 0.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
