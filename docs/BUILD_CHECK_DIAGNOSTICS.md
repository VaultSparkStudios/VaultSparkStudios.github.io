# Build Check Diagnostics

Generated: 2026-09-01T10:40:51.110Z
Receipt: `9ff089ec50e56f3adf60405d` · coverage 46/378 from step 1

Latest: **45/46** passed · failed 1 · total 29.7s
Concentration: **23.8%** in step 29 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 29 | 7.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 46 | 1.5s | 1 | `node scripts/build-candidate-artifact-manifest.mjs --check` |
| 23 | 1.5s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 37 | 1.1s | 0 | `node scripts/build-worker-route-history.mjs --check` |
| 41 | 1.0s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 39 | 0.9s | 0 | `node scripts/build-deploy-currency.mjs --check` |
| 1 | 0.8s | 0 | `node scripts/manage-forge-editorial.mjs --self-test` |
| 40 | 0.7s | 0 | `node scripts/build-oracle-velocity-public.mjs --self-test` |
| 6 | 0.6s | 0 | `node scripts/lib/startup-evidence.mjs --self-test` |
| 8 | 0.6s | 0 | `node scripts/build-proof-aware-projects.mjs --check` |

## Failures

- Step 46: `node scripts/build-candidate-artifact-manifest.mjs --check` exited 1
