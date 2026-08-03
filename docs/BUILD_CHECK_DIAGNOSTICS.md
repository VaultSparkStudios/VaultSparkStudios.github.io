# Build Check Diagnostics

Generated: 2026-08-03T01:36:39.056Z
Receipt: `ceb77cb9b253a5ec671a24d0` · coverage 269/269 from step 1

Latest: **269/269** passed · failed 0 · total 123.7s
Concentration: **16.0%** in step 122 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 122 | 19.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 43 | 12.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 75 | 4.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 78 | 3.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 16 | 3.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 215 | 2.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 260 | 1.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 249 | 1.6s | 0 | `node scripts/crawl-all-pages.mjs` |
| 115 | 1.3s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 100 | 1.3s | 0 | `node scripts/verify-supply-chain.mjs` |

## Failures

- None.
