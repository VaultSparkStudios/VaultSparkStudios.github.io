# Build Check Diagnostics

Generated: 2026-09-17T07:11:04.501Z
Receipt: `c389f02da64985e2bd1e63fa` · coverage 46/495 from step 1

Latest: **45/46** passed · failed 1 · total 5.9s
Concentration: **15.8%** in step 29 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 29 | 0.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 23 | 0.4s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 41 | 0.3s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 40 | 0.2s | 0 | `node scripts/build-oracle-velocity-public.mjs --self-test` |
| 8 | 0.1s | 0 | `node scripts/build-proof-aware-projects.mjs --check` |
| 1 | 0.1s | 0 | `node scripts/manage-forge-editorial.mjs --self-test` |
| 44 | 0.1s | 0 | `node scripts/check-artifact-reproducibility.mjs` |
| 25 | 0.1s | 0 | `node scripts/check-production-promotion-gate.mjs --self-test` |
| 2 | 0.1s | 0 | `node scripts/manage-forge-editorial.mjs --check` |
| 26 | 0.1s | 0 | `node scripts/check-production-promotion-gate.mjs --check` |

## Failures

- Step 46: `node scripts/build-candidate-artifact-manifest.mjs --check` exited 1
