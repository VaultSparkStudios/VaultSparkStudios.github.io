# Build Check Diagnostics

Generated: 2026-08-13T04:37:32.515Z
Receipt: `50bac128a5c7981908e0e0ab` · coverage 55/295 from step 1

Latest: **54/55** passed · failed 1 · total 9.9s
Concentration: **47.1%** in step 55 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 55 | 4.6s | 1 | `node scripts/smoke-startup-scripts.mjs` |
| 28 | 0.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 52 | 0.5s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 23 | 0.3s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 35 | 0.1s | 0 | `node scripts/build-worker-route-history.mjs --self-test` |
| 44 | 0.1s | 0 | `node scripts/rollup-rum-ux.mjs --self-test` |
| 32 | 0.1s | 0 | `node scripts/check-uptime-contract.mjs` |
| 40 | 0.1s | 0 | `node scripts/build-candidate-artifact-manifest.mjs --check` |
| 30 | 0.1s | 0 | `node scripts/build-ci-status-beacon.mjs --self-test` |
| 38 | 0.1s | 0 | `node scripts/build-deploy-currency.mjs --check` |

## Failures

- Step 55: `node scripts/smoke-startup-scripts.mjs` exited 1
