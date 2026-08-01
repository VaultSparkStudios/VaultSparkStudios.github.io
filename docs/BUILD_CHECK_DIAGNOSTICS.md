# Build Check Diagnostics

Generated: 2026-08-01T04:47:24.499Z
Receipt: `067fefbaf4592e0f8b275e1b` · coverage 267/267 from step 1

Latest: **267/267** passed · failed 0 · total 120.2s
Concentration: **15.9%** in step 122 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 122 | 19.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 43 | 17.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 75 | 3.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 16 | 3.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 78 | 2.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 215 | 1.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 100 | 1.7s | 0 | `node scripts/verify-supply-chain.mjs` |
| 247 | 1.4s | 0 | `node scripts/crawl-all-pages.mjs` |
| 11 | 1.2s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 47 | 1.1s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
