# Build Check Diagnostics

Generated: 2026-07-26T20:55:37.466Z

Latest: **241/241** passed · failed 0 · total 99.5s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 86 | 29.5s | 0 | `node scripts/verify-supply-chain.mjs` |
| 108 | 11.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 7.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 64 | 2.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 2.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 197 | 1.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 2 | 1.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 237 | 1.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 226 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 65 | 0.8s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
