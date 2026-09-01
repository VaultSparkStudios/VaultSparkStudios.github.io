# Build Check Diagnostics

Generated: 2026-09-01T13:54:17.285Z
Receipt: `244f2b5daff1caac04bf5718` · coverage 61/378 from step 1

Latest: **60/61** passed · failed 1 · total 139.8s
Concentration: **55.3%** in step 61 · ratchet BREACHED (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 61 | 77.3s | 1 | `node scripts/smoke-startup-scripts.mjs` |
| 58 | 15.0s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 29 | 7.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 23 | 2.0s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 41 | 1.9s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 54 | 1.4s | 0 | `node scripts/check-play-next-impression-contract.mjs` |
| 60 | 1.3s | 0 | `node scripts/check-obelisk-passport-contract.mjs` |
| 1 | 1.2s | 0 | `node scripts/manage-forge-editorial.mjs --self-test` |
| 24 | 1.1s | 0 | `node scripts/check-promotion-scope.mjs --self-test` |
| 12 | 1.1s | 0 | `node scripts/check-proof-verifier-contract.mjs` |

## Failures

- Step 61: `node scripts/smoke-startup-scripts.mjs` exited 1
