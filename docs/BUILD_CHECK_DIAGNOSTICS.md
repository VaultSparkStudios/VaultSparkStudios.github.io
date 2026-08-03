# Build Check Diagnostics

Generated: 2026-08-03T20:47:31.834Z
Receipt: `b432235a1d085e9c82208d34` · coverage 275/275 from step 1

Latest: **275/275** passed · failed 0 · total 167.0s
Concentration: **15.7%** in step 47 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 47 | 26.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 126 | 18.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 79 | 6.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 20 | 4.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 82 | 3.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 104 | 2.7s | 0 | `node scripts/verify-supply-chain.mjs` |
| 31 | 2.1s | 0 | `node scripts/build-candidate-artifact-manifest.mjs --self-test` |
| 30 | 2.0s | 0 | `node scripts/build-deploy-currency.mjs --check` |
| 33 | 2.0s | 0 | `node scripts/check-rum-anomaly-canary.mjs --check` |
| 38 | 2.0s | 0 | `node scripts/check-funnel-contract.mjs` |

## Failures

- None.
