# Build Check Diagnostics

Generated: 2026-09-01T13:47:48.741Z
Receipt: `4fd08c0fd36a9d0979ed8b28` · coverage 100/378 from step 264

Latest: **99/100** passed · failed 1 · total 219.6s
Concentration: **24.9%** in step 296 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 296 | 54.7s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 345 | 10.4s | 0 | `node scripts/check-orphan-libs.mjs --check` |
| 363 | 8.6s | 1 | `node scripts/check-windows-hide.mjs` |
| 337 | 6.3s | 0 | `node scripts/check-hardfail-resilience.mjs` |
| 351 | 6.2s | 0 | `node scripts/check-static-csp-routes.mjs` |
| 336 | 5.2s | 0 | `node scripts/check-hardfail-resilience.mjs --self-test` |
| 285 | 4.5s | 0 | `node scripts/crawl-all-pages.mjs` |
| 310 | 4.1s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 320 | 4.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 324 | 3.8s | 0 | `node scripts/check-news-claim-parity.mjs` |

## Failures

- Step 363: `node scripts/check-windows-hide.mjs` exited 1
