# Build Check Diagnostics

Generated: 2026-08-03T07:21:20.055Z
Receipt: `355049701edaffef52e4ea49` · coverage 269/269 from step 1

Latest: **269/269** passed · failed 0 · total 277.9s
Concentration: **15.6%** in step 122 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 122 | 43.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 43 | 29.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 75 | 9.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 16 | 7.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 260 | 4.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 78 | 3.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 215 | 3.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 249 | 2.6s | 0 | `node scripts/crawl-all-pages.mjs` |
| 186 | 2.3s | 0 | `node scripts/check-closeout-boundary.mjs` |
| 100 | 2.3s | 0 | `node scripts/verify-supply-chain.mjs` |

## Failures

- None.
