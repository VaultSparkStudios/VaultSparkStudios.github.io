# Build Check Diagnostics

Generated: 2026-07-30T02:07:26.398Z
Receipt: `68cab6dc817228f1778e859a` · coverage 255/255 from step 1

Latest: **255/255** passed · failed 0 · total 83.3s
Concentration: **18.1%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 15.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 9.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 3.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 2.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 2.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 95 | 1.7s | 0 | `node scripts/verify-supply-chain.mjs` |
| 208 | 1.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 240 | 1.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 106 | 0.8s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 42 | 0.7s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
