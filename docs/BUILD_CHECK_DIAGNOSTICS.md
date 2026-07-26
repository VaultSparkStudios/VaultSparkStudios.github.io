# Build Check Diagnostics

Generated: 2026-07-26T07:52:13.451Z

Latest: **234/234** passed · failed 0 · total 94.2s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 84 | 26.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 106 | 11.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 27 | 8.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 62 | 3.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 59 | 2.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 190 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 2 | 1.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 219 | 1.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 152 | 0.8s | 0 | `node scripts/analyze-home-lcp.mjs --self-test` |
| 95 | 0.8s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |

## Failures

- None.
