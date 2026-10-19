# Build Check Diagnostics

Generated: 2026-10-19T20:05:43.793Z
Receipt: `0ef55ba27bd9ee99442a6c6c` · coverage 21/542 from step 1

Latest: **20/21** passed · failed 1 · total 43.3s
Concentration: **74.3%** in step 1 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 1 | 32.2s | 0 | `node --test tests/deployment-admission.unit.spec.mjs` |
| 6 | 4.5s | 0 | `node --test tests/s371-release-maintenance.unit.spec.mjs tests/s372-redirect-chains.unit.spec.mjs tests/s373-guards.unit.spec.mjs tests/s373-pages-redirects.unit.spec.mjs` |
| 4 | 0.9s | 0 | `node --test tests/tt-storage.unit.spec.mjs` |
| 3 | 0.8s | 0 | `node --test tests/csp-reports.unit.spec.mjs` |
| 19 | 0.4s | 0 | `node scripts/check-startup-context-budget.mjs` |
| 17 | 0.4s | 0 | `node scripts/build-spark-manifest.mjs --check` |
| 7 | 0.3s | 0 | `node scripts/check-live-surface-matrix.mjs --self-test` |
| 20 | 0.3s | 0 | `node scripts/build-proof-aware-projects.mjs --self-test` |
| 18 | 0.3s | 0 | `node scripts/check-startup-context-budget.mjs --self-test` |
| 5 | 0.3s | 0 | `node scripts/provision-tt-storage.mjs --self-test` |

## Failures

- Step 21: `node scripts/build-proof-aware-projects.mjs --check` exited 1
