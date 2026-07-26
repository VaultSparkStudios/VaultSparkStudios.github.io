# Build Check Diagnostics

Generated: 2026-07-26T20:59:04.871Z

Latest: **241/241** passed · failed 0 · total 103.7s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 86 | 28.1s | 0 | `node scripts/verify-supply-chain.mjs` |
| 108 | 11.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 7.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 64 | 2.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 2.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 2.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 197 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 226 | 1.6s | 0 | `node scripts/crawl-all-pages.mjs` |
| 237 | 1.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 65 | 0.8s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
