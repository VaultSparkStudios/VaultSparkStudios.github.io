# Build Check Diagnostics

Generated: 2026-07-17T21:12:25.872Z

Latest: **218/218** passed · failed 0 · total 88.4s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 78 | 41.0s | 0 | `node scripts/verify-supply-chain.mjs` |
| 100 | 7.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 4.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 56 | 3.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 53 | 2.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 184 | 1.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 2 | 1.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 203 | 1.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 214 | 0.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 57 | 0.8s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
