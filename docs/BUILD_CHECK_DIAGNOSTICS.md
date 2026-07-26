# Build Check Diagnostics

Generated: 2026-07-26T19:43:57.924Z

Latest: **240/240** passed · failed 0 · total 109.9s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 86 | 34.2s | 0 | `node scripts/verify-supply-chain.mjs` |
| 108 | 12.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 8.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 64 | 3.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 3.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 236 | 2.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 196 | 1.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 2 | 1.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 225 | 1.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 65 | 1.0s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
