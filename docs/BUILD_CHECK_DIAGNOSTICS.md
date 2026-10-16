# Build Check Diagnostics

Generated: 2026-10-16T02:27:43.382Z
Receipt: `d374452c6cd32a9b9cc825ad` · coverage 81/537 from step 1

Latest: **80/81** passed · failed 1 · total 17.8s
Concentration: **34.2%** in step 69 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 69 | 6.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 74 | 1.6s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 1 | 1.1s | 0 | `node --test tests/s371-release-maintenance.unit.spec.mjs tests/s372-redirect-chains.unit.spec.mjs tests/s373-guards.unit.spec.mjs tests/s373-pages-redirects.unit.spec.mjs` |
| 66 | 0.7s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 37 | 0.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 49 | 0.5s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 73 | 0.4s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 48 | 0.3s | 0 | `node scripts/build-oracle-velocity-public.mjs --self-test` |
| 31 | 0.3s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 56 | 0.2s | 0 | `node scripts/build-ambient-bundle.mjs --check` |

## Failures

- Step 81: `node scripts/build-release-proof.mjs --check` exited 1
