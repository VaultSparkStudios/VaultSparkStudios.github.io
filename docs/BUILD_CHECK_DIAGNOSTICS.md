# Build Check Diagnostics

Generated: 2026-07-31T07:17:55.948Z
Receipt: `539c530629c845aa00b1f6e2` · coverage 261/261 from step 1

Latest: **261/261** passed · failed 0 · total 153.0s
Concentration: **17.7%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 27.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 13.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 11 | 9.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 70 | 5.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 3.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 210 | 2.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 95 | 1.8s | 0 | `node scripts/verify-supply-chain.mjs` |
| 242 | 1.4s | 0 | `node scripts/crawl-all-pages.mjs` |
| 110 | 1.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 81 | 1.0s | 0 | `node scripts/verify-push-contract.mjs` |

## Failures

- None.
