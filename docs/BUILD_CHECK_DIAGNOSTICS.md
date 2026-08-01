# Build Check Diagnostics

Generated: 2026-08-01T06:03:21.700Z
Receipt: `a56b0c2d7735ac6f68f84f59` · coverage 267/267 from step 1

Latest: **267/267** passed · failed 0 · total 175.4s
Concentration: **14.7%** in step 43 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 43 | 25.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 122 | 23.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 75 | 6.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 16 | 4.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 78 | 3.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 215 | 2.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 100 | 2.2s | 0 | `node scripts/verify-supply-chain.mjs` |
| 247 | 1.7s | 0 | `node scripts/crawl-all-pages.mjs` |
| 11 | 1.5s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 47 | 1.4s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
