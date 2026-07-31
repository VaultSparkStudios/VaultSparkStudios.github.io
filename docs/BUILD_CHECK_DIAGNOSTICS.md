# Build Check Diagnostics

Generated: 2026-07-31T02:06:07.708Z
Receipt: `389915a09759ee9e8a2fa979` · coverage 261/261 from step 1

Latest: **261/261** passed · failed 0 · total 131.0s
Concentration: **24.4%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 32.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 11.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 3.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 2.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 2.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 110 | 2.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 106 | 2.0s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 210 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 104 | 1.4s | 0 | `node scripts/check-ambient-placement.mjs` |
| 242 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
