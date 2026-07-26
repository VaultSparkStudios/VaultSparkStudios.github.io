# Build Check Diagnostics

Generated: 2026-07-26T21:10:32.891Z

Latest: **241/241** passed · failed 0 · total 90.8s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 86 | 25.5s | 0 | `node scripts/verify-supply-chain.mjs` |
| 108 | 11.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 7.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 64 | 2.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 2.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 197 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 2 | 1.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 237 | 1.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 226 | 0.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 65 | 0.8s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
