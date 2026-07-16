# Build Check Diagnostics

Generated: 2026-07-16T18:47:26.802Z

Latest: **213/213** passed · failed 0 · total 55.2s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 75 | 23.0s | 0 | `node scripts/verify-supply-chain.mjs` |
| 97 | 5.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 53 | 2.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 21 | 1.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 50 | 1.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 179 | 1.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 198 | 1.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 82 | 0.6s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 209 | 0.6s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 2 | 0.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
