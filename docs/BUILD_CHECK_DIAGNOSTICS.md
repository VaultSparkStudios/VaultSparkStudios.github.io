# Build Check Diagnostics

Generated: 2026-10-13T21:10:41.616Z
Receipt: `5bcc597c4086958ece10aeb1` · coverage 14/534 from step 1

Latest: **13/14** passed · failed 1 · total 22.9s
Concentration: **43.3%** in step 1 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 1 | 9.9s | 0 | `node --test tests/s371-release-maintenance.unit.spec.mjs tests/s372-redirect-chains.unit.spec.mjs tests/s373-guards.unit.spec.mjs tests/s373-pages-redirects.unit.spec.mjs` |
| 3 | 1.7s | 0 | `node scripts/check-served-parity.mjs --self-test` |
| 12 | 1.6s | 0 | `node scripts/build-spark-manifest.mjs --check` |
| 6 | 1.5s | 0 | `node scripts/repair-evidence-graph.mjs --self-test` |
| 8 | 1.3s | 0 | `node scripts/manage-forge-editorial.mjs --self-test` |
| 5 | 1.2s | 0 | `node scripts/desk-art-autopilot.mjs --self-test` |
| 11 | 1.1s | 0 | `node scripts/check-journey-conductor-contract.mjs --check` |
| 4 | 1.0s | 0 | `node scripts/verify-clean-checkout.mjs --self-test` |
| 9 | 0.8s | 0 | `node scripts/manage-forge-editorial.mjs --check` |
| 2 | 0.8s | 0 | `node scripts/check-live-surface-matrix.mjs --self-test` |

## Failures

- Step 14: `node scripts/check-startup-context-budget.mjs` exited 1
