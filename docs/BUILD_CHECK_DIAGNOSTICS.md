# Build Check Diagnostics

Generated: 2026-08-13T04:07:48.957Z
Receipt: `7430bc3ae0cdd0611256a722` · coverage 55/295 from step 1

Latest: **54/55** passed · failed 1 · total 10.5s
Concentration: **46.7%** in step 55 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 55 | 4.9s | 1 | `node scripts/smoke-startup-scripts.mjs` |
| 28 | 0.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 52 | 0.5s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 23 | 0.3s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 44 | 0.1s | 0 | `node scripts/rollup-rum-ux.mjs --self-test` |
| 16 | 0.1s | 0 | `node scripts/probe-supabase-control-plane.mjs --check` |
| 37 | 0.1s | 0 | `node scripts/build-deploy-currency.mjs --self-test` |
| 40 | 0.1s | 0 | `node scripts/build-candidate-artifact-manifest.mjs --check` |
| 24 | 0.1s | 0 | `node scripts/check-production-promotion-gate.mjs --self-test` |
| 34 | 0.1s | 0 | `node scripts/build-worker-route-provenance.mjs --check` |

## Failures

- Step 55: `node scripts/smoke-startup-scripts.mjs` exited 1
