# Build Check Diagnostics

Generated: 2026-10-18T15:11:22.295Z
Receipt: `df7db1ae49205e9a8ad4f3e9` · coverage 75/539 from step 1

Latest: **74/75** passed · failed 1 · total 77.8s
Concentration: **34.4%** in step 71 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 71 | 26.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 68 | 6.7s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 3 | 4.2s | 0 | `node --test tests/s371-release-maintenance.unit.spec.mjs tests/s372-redirect-chains.unit.spec.mjs tests/s373-guards.unit.spec.mjs tests/s373-pages-redirects.unit.spec.mjs` |
| 39 | 4.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 51 | 2.6s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 33 | 2.3s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 75 | 1.8s | 1 | `node scripts/check-startup-meter-freshness.mjs` |
| 50 | 1.3s | 0 | `node scripts/build-oracle-velocity-public.mjs --self-test` |
| 48 | 1.1s | 0 | `node scripts/build-deploy-currency.mjs --self-test` |
| 53 | 0.9s | 0 | `node scripts/check-artifact-reproducibility.mjs --self-test` |

## Failures

- Step 75: `node scripts/check-startup-meter-freshness.mjs` exited 1
