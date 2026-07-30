# Build Check Diagnostics

Generated: 2026-07-30T01:59:45.674Z
Receipt: `b77d921e8c54b7701eb2bfe1` · coverage 255/255 from step 1

Latest: **255/255** passed · failed 0 · total 111.4s
Concentration: **17.3%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 19.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 15.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 11 | 4.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 70 | 3.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 2.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 95 | 2.5s | 0 | `node scripts/verify-supply-chain.mjs` |
| 208 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 42 | 1.1s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 240 | 1.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 106 | 0.8s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |

## Failures

- None.
