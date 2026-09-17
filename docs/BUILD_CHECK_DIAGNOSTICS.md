# Build Check Diagnostics

Generated: 2026-09-17T10:19:16.040Z
Receipt: `ea53457864e48d803501b0c9` · coverage 61/499 from step 1

Latest: **60/61** passed · failed 1 · total 11.7s
Concentration: **45.9%** in step 61 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 61 | 5.4s | 1 | `node scripts/smoke-startup-scripts.mjs` |
| 29 | 0.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 58 | 0.6s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 23 | 0.3s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 41 | 0.3s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 40 | 0.2s | 0 | `node scripts/build-oracle-velocity-public.mjs --self-test` |
| 38 | 0.1s | 0 | `node scripts/build-deploy-currency.mjs --self-test` |
| 46 | 0.1s | 0 | `node scripts/build-candidate-artifact-manifest.mjs --check` |
| 50 | 0.1s | 0 | `node scripts/rollup-rum-ux.mjs --self-test` |
| 27 | 0.1s | 0 | `node scripts/check-lighthouse-trend.mjs --self-test` |

## Failures

- Step 61: `node scripts/smoke-startup-scripts.mjs` exited 1
