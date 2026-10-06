# Build Check Diagnostics

Generated: 2026-10-06T15:18:50.304Z
Receipt: `57c699130809ac2b7b54bb40` · coverage 77/530 from step 1

Latest: **76/77** passed · failed 1 · total 69.9s
Concentration: **22.9%** in step 65 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 65 | 16.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 33 | 3.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 45 | 3.2s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 44 | 2.0s | 0 | `node scripts/build-oracle-velocity-public.mjs --self-test` |
| 1 | 1.7s | 0 | `node scripts/desk-art-autopilot.mjs --self-test` |
| 69 | 1.7s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 5 | 1.6s | 0 | `node scripts/manage-forge-editorial.mjs --check` |
| 70 | 1.5s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 27 | 1.4s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 47 | 1.4s | 0 | `node scripts/check-artifact-reproducibility.mjs --self-test` |

## Failures

- Step 77: `node scripts/build-release-proof.mjs --check` exited 1
