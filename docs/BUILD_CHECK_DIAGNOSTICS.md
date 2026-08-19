# Build Check Diagnostics

Generated: 2026-08-19T19:16:24.803Z
Receipt: `0f3150e516995c0b1929691e` · coverage 319/319 from step 1

Latest: **319/319** passed · failed 0 · total 687.4s
Concentration: **16.4%** in step 259 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 259 | 113.0s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 138 | 107.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 59 | 28.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 281 | 21.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 131 | 15.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 94 | 12.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 12.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 244 | 10.2s | 0 | `node scripts/check-public-safe-tracking.mjs` |
| 265 | 10.1s | 0 | `node scripts/check-page-script-relevance.mjs` |
| 292 | 9.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
