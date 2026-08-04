# Build Check Diagnostics

Generated: 2026-08-04T00:22:30.691Z
Receipt: `414579c0e5629fe59699f50b` · coverage 275/275 from step 1

Latest: **275/275** passed · failed 0 · total 542.8s
Concentration: **18.2%** in step 126 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 126 | 98.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 47 | 48.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 79 | 19.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 20 | 12.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 212 | 7.9s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 255 | 5.6s | 0 | `node scripts/crawl-all-pages.mjs` |
| 82 | 4.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 104 | 4.0s | 0 | `node scripts/verify-supply-chain.mjs` |
| 183 | 3.8s | 0 | `node scripts/build-staging-deploy-continuity.mjs --check` |
| 15 | 3.7s | 0 | `node scripts/check-capability-discovery-contract.mjs` |

## Failures

- None.
