# Build Check Diagnostics

Generated: 2026-09-01T23:56:31.177Z
Receipt: `3901ebbc5d1f4bab76a40a3a` · coverage 72/378 from step 1

Latest: **71/72** passed · failed 1 · total 32.7s
Concentration: **37.3%** in step 61 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 61 | 12.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 29 | 2.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 66 | 1.5s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 58 | 1.4s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 65 | 0.9s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 41 | 0.7s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 23 | 0.7s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 40 | 0.5s | 0 | `node scripts/build-oracle-velocity-public.mjs --self-test` |
| 63 | 0.3s | 0 | `node scripts/check-lighthouse-route-tiers.mjs` |
| 11 | 0.3s | 0 | `node scripts/check-proof-verifier-contract.mjs --self-test` |

## Failures

- Step 72: `node scripts/build-promotion-receipt.mjs --check` exited 1
