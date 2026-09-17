# Build Check Diagnostics

Generated: 2026-09-15T15:03:31.578Z
Receipt: `bf51ad209019d98d99c8782d` · coverage 33/495 from step 1

Latest: **32/33** passed · failed 1 · total 4.6s
Concentration: **22.3%** in step 29 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 29 | 1.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 23 | 0.4s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 8 | 0.1s | 0 | `node scripts/build-proof-aware-projects.mjs --check` |
| 12 | 0.1s | 0 | `node scripts/check-proof-verifier-contract.mjs` |
| 21 | 0.1s | 0 | `node scripts/check-capability-discovery-contract.mjs --self-test` |
| 3 | 0.1s | 0 | `node scripts/check-journey-conductor-contract.mjs --self-test` |
| 7 | 0.1s | 0 | `node scripts/build-proof-aware-projects.mjs --self-test` |
| 22 | 0.1s | 0 | `node scripts/check-obelisk-link-readiness.mjs --self-test` |
| 6 | 0.1s | 0 | `node scripts/lib/startup-evidence.mjs --self-test` |
| 9 | 0.1s | 0 | `node scripts/check-theme-boot-contract.mjs --self-test` |

## Failures

- Step 33: `node scripts/check-uptime-contract.mjs` exited 1
