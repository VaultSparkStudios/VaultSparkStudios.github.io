# Build Check Diagnostics

Generated: 2026-08-16T03:27:00.794Z
Receipt: `5f7b7da2c3fa259d23b8d51d` · coverage 11/295 from step 1

Latest: **10/11** passed · failed 1 · total 0.7s
Concentration: **10.7%** in step 8 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 8 | 0.1s | 0 | `node scripts/build-proof-aware-projects.mjs --check` |
| 11 | 0.1s | 1 | `node scripts/check-proof-verifier-contract.mjs --self-test` |
| 7 | 0.1s | 0 | `node scripts/build-proof-aware-projects.mjs --self-test` |
| 2 | 0.1s | 0 | `node scripts/manage-forge-editorial.mjs --check` |
| 1 | 0.1s | 0 | `node scripts/manage-forge-editorial.mjs --self-test` |
| 5 | 0.1s | 0 | `node scripts/check-startup-context-budget.mjs` |
| 4 | 0.1s | 0 | `node scripts/check-startup-context-budget.mjs --self-test` |
| 10 | 0.1s | 0 | `node scripts/check-theme-boot-contract.mjs` |
| 3 | 0.1s | 0 | `node scripts/check-journey-conductor-contract.mjs --self-test` |
| 9 | 0.1s | 0 | `node scripts/check-theme-boot-contract.mjs --self-test` |

## Failures

- Step 11: `node scripts/check-proof-verifier-contract.mjs --self-test` exited 1
