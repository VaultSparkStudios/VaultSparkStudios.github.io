# Build Check Diagnostics

Generated: 2026-08-01T22:26:53.397Z
Receipt: `ee44a173b3212509b7720ef7` · coverage 267/267 from step 1

Latest: **267/267** passed · failed 0 · total 139.5s
Concentration: **14.6%** in step 43 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 43 | 20.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 122 | 17.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 75 | 6.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 16 | 5.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 78 | 3.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 215 | 2.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 100 | 1.7s | 0 | `node scripts/verify-supply-chain.mjs` |
| 11 | 1.6s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 115 | 1.3s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 247 | 1.2s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
