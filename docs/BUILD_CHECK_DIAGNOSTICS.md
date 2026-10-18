# Build Check Diagnostics

Generated: 2026-10-18T14:53:22.403Z
Receipt: `e04765ea7524235e4b511dcb` · coverage 18/539 from step 1

Latest: **17/18** passed · failed 1 · total 14.6s
Concentration: **37.3%** in step 3 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 3 | 5.5s | 0 | `node --test tests/s371-release-maintenance.unit.spec.mjs tests/s372-redirect-chains.unit.spec.mjs tests/s373-guards.unit.spec.mjs tests/s373-pages-redirects.unit.spec.mjs` |
| 14 | 1.0s | 0 | `node scripts/build-spark-manifest.mjs --check` |
| 1 | 0.9s | 0 | `node --test tests/tt-storage.unit.spec.mjs` |
| 17 | 0.8s | 0 | `node scripts/build-proof-aware-projects.mjs --self-test` |
| 5 | 0.8s | 0 | `node scripts/check-served-parity.mjs --self-test` |
| 16 | 0.7s | 0 | `node scripts/check-startup-context-budget.mjs` |
| 7 | 0.6s | 0 | `node scripts/desk-art-autopilot.mjs --self-test` |
| 9 | 0.6s | 0 | `node scripts/review-satire-batch.mjs --self-test` |
| 11 | 0.6s | 0 | `node scripts/manage-forge-editorial.mjs --check` |
| 18 | 0.5s | 1 | `node scripts/build-proof-aware-projects.mjs --check` |

## Failures

- Step 18: `node scripts/build-proof-aware-projects.mjs --check` exited 1
