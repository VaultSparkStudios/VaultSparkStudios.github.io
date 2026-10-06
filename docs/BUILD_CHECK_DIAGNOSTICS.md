# Build Check Diagnostics

Generated: 2026-10-06T22:56:17.854Z
Receipt: `b971e72481425d584f6d0021` · coverage 10/530 from step 1

Latest: **9/10** passed · failed 1 · total 4.3s
Concentration: **14.8%** in step 3 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 3 | 0.6s | 0 | `node scripts/review-satire-batch.mjs --self-test` |
| 6 | 0.4s | 0 | `node scripts/check-journey-conductor-contract.mjs --self-test` |
| 8 | 0.4s | 0 | `node scripts/build-spark-manifest.mjs --check` |
| 5 | 0.4s | 0 | `node scripts/manage-forge-editorial.mjs --check` |
| 1 | 0.4s | 0 | `node scripts/desk-art-autopilot.mjs --self-test` |
| 10 | 0.4s | 1 | `node scripts/check-startup-context-budget.mjs` |
| 9 | 0.4s | 0 | `node scripts/check-startup-context-budget.mjs --self-test` |
| 2 | 0.4s | 0 | `node scripts/repair-evidence-graph.mjs --self-test` |
| 7 | 0.4s | 0 | `node scripts/check-journey-conductor-contract.mjs --check` |
| 4 | 0.4s | 0 | `node scripts/manage-forge-editorial.mjs --self-test` |

## Failures

- Step 10: `node scripts/check-startup-context-budget.mjs` exited 1
