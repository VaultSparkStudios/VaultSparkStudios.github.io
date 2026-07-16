# Build Check Diagnostics

Generated: 2026-07-16T19:39:57.881Z

Latest: **213/213** passed · failed 0 · total 64.6s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 75 | 25.1s | 0 | `node scripts/verify-supply-chain.mjs` |
| 97 | 5.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 74 | 2.6s | 0 | `node scripts/check-sri.mjs` |
| 53 | 2.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 21 | 1.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 50 | 1.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 179 | 1.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 73 | 0.9s | 0 | `node scripts/csp-audit.mjs` |
| 198 | 0.8s | 0 | `node scripts/crawl-all-pages.mjs` |
| 25 | 0.7s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
