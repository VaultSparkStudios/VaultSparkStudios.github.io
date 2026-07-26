# Build Check Diagnostics

Generated: 2026-07-26T21:06:45.020Z

Latest: **241/241** passed · failed 0 · total 91.9s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 86 | 26.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 108 | 11.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 7.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 64 | 2.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 2.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 1.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 197 | 1.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 237 | 1.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 226 | 1.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 65 | 0.9s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
