# Build Check Diagnostics

Generated: 2026-07-26T18:57:58.260Z

Latest: **238/238** passed · failed 0 · total 92.4s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 86 | 27.8s | 0 | `node scripts/verify-supply-chain.mjs` |
| 108 | 10.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 7.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 64 | 2.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 2.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 194 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 2 | 1.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 234 | 1.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 223 | 0.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 155 | 0.9s | 0 | `node scripts/analyze-home-lcp.mjs --check` |

## Failures

- None.
