# Build Check Diagnostics

Generated: 2026-07-14T21:32:16.251Z

Latest: **85/86** passed · failed 1 · total 63.5s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 71 | 20.5s | 0 | `node scripts/verify-supply-chain.mjs` |
| 21 | 8.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 46 | 4.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 3.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 49 | 2.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 82 | 1.0s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 25 | 1.0s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 86 | 0.7s | 1 | `node scripts/build-geo-vitals.mjs --check` |
| 78 | 0.7s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 50 | 0.7s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- Step 86: `node scripts/build-geo-vitals.mjs --check` exited 1
