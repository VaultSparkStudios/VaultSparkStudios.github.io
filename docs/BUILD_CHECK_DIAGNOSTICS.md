# Build Check Diagnostics

Generated: 2026-07-16T22:50:11.742Z

Latest: **215/215** passed · failed 0 · total 202.3s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 76 | 93.8s | 0 | `node scripts/verify-supply-chain.mjs` |
| 98 | 13.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 10.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 51 | 5.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 54 | 4.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 2 | 3.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 211 | 3.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 181 | 2.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 200 | 2.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 25 | 1.6s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
