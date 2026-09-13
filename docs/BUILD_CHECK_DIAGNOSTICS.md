# Build Check Diagnostics

Generated: 2026-09-13T05:41:54.129Z
Receipt: `750d2df798978f218a7384ff` · coverage 11/481 from step 1

Latest: **10/11** passed · failed 1 · total 0.6s
Concentration: **10.9%** in step 8 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 8 | 0.1s | 0 | `node scripts/build-proof-aware-projects.mjs --check` |
| 1 | 0.1s | 0 | `node scripts/manage-forge-editorial.mjs --self-test` |
| 2 | 0.1s | 0 | `node scripts/manage-forge-editorial.mjs --check` |
| 11 | 0.1s | 1 | `node scripts/check-proof-verifier-contract.mjs --self-test` |
| 5 | 0.1s | 0 | `node scripts/check-startup-context-budget.mjs` |
| 7 | 0.1s | 0 | `node scripts/build-proof-aware-projects.mjs --self-test` |
| 9 | 0.1s | 0 | `node scripts/check-theme-boot-contract.mjs --self-test` |
| 3 | 0.1s | 0 | `node scripts/check-journey-conductor-contract.mjs --self-test` |
| 10 | 0.1s | 0 | `node scripts/check-theme-boot-contract.mjs` |
| 4 | 0.1s | 0 | `node scripts/check-startup-context-budget.mjs --self-test` |

## Failures

- Step 11: `node scripts/check-proof-verifier-contract.mjs --self-test` exited 1
