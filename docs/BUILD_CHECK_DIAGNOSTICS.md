# Build Check Diagnostics

Generated: 2026-09-17T07:10:22.626Z
Receipt: `ec41b7d23f9828f2334c503e` · coverage 33/495 from step 1

Latest: **32/33** passed · failed 1 · total 3.8s
Concentration: **23.6%** in step 29 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 29 | 0.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 23 | 0.3s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 12 | 0.1s | 0 | `node scripts/check-proof-verifier-contract.mjs` |
| 18 | 0.1s | 0 | `node scripts/build-identity-migration-receipt.mjs --check` |
| 26 | 0.1s | 0 | `node scripts/check-production-promotion-gate.mjs --check` |
| 27 | 0.1s | 0 | `node scripts/check-lighthouse-trend.mjs --self-test` |
| 14 | 0.1s | 0 | `node scripts/check-shell-parity-contract.mjs` |
| 11 | 0.1s | 0 | `node scripts/check-proof-verifier-contract.mjs --self-test` |
| 21 | 0.1s | 0 | `node scripts/check-capability-discovery-contract.mjs --self-test` |
| 24 | 0.1s | 0 | `node scripts/check-promotion-scope.mjs --self-test` |

## Failures

- Step 33: `node scripts/check-uptime-contract.mjs` exited 1
