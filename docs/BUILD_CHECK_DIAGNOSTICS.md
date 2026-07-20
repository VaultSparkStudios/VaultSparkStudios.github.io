# Build Check Diagnostics

Generated: 2026-07-20T09:11:04.004Z

Latest: **218/218** passed · failed 0 · total 105.3s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 78 | 43.2s | 0 | `node scripts/verify-supply-chain.mjs` |
| 100 | 10.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 7.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 56 | 2.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 53 | 2.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 1.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 184 | 1.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 214 | 1.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 203 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 54 | 0.8s | 0 | `node scripts/check-orphan-shell-assets.mjs --warn-only` |

## Failures

- None.
