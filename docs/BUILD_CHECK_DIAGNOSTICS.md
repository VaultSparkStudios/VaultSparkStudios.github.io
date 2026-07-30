# Build Check Diagnostics

Generated: 2026-07-30T02:18:39.011Z
Receipt: `44e3045bbfd89fc9f9714334` · coverage 255/255 from step 1

Latest: **255/255** passed · failed 0 · total 84.1s
Concentration: **17.0%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 14.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 9.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 3.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 2.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 2.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 95 | 1.6s | 0 | `node scripts/verify-supply-chain.mjs` |
| 208 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 240 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 165 | 0.8s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |
| 166 | 0.8s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |

## Failures

- None.
