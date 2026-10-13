# Build Check Diagnostics

Generated: 2026-10-13T07:04:58.920Z
Receipt: `829b10bb301cc4e120e41620` · coverage 14/534 from step 1

Latest: **13/14** passed · failed 1 · total 3.8s
Concentration: **64.5%** in step 1 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 1 | 2.4s | 0 | `node --test tests/s371-release-maintenance.unit.spec.mjs tests/s372-redirect-chains.unit.spec.mjs tests/s373-guards.unit.spec.mjs tests/s373-pages-redirects.unit.spec.mjs` |
| 8 | 0.2s | 0 | `node scripts/manage-forge-editorial.mjs --self-test` |
| 5 | 0.1s | 0 | `node scripts/desk-art-autopilot.mjs --self-test` |
| 12 | 0.1s | 0 | `node scripts/build-spark-manifest.mjs --check` |
| 4 | 0.1s | 0 | `node scripts/verify-clean-checkout.mjs --self-test` |
| 3 | 0.1s | 0 | `node scripts/check-served-parity.mjs --self-test` |
| 9 | 0.1s | 0 | `node scripts/manage-forge-editorial.mjs --check` |
| 2 | 0.1s | 0 | `node scripts/check-live-surface-matrix.mjs --self-test` |
| 6 | 0.1s | 0 | `node scripts/repair-evidence-graph.mjs --self-test` |
| 10 | 0.1s | 0 | `node scripts/check-journey-conductor-contract.mjs --self-test` |

## Failures

- Step 14: `node scripts/check-startup-context-budget.mjs` exited 1
