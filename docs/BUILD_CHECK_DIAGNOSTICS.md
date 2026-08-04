# Build Check Diagnostics

Generated: 2026-08-04T03:16:31.928Z
Receipt: `99b71d5b4cbeeea1ddc6cef6` · coverage 20/275 from step 1

Latest: **19/20** passed · failed 1 · total 51.8s
Concentration: **32.5%** in step 20 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 20 | 16.8s | 1 | `node scripts/check-generated-drift-preflight.mjs` |
| 15 | 6.1s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 14 | 2.5s | 0 | `node scripts/check-obelisk-link-readiness.mjs --self-test` |
| 6 | 2.1s | 0 | `node scripts/check-shell-parity-contract.mjs` |
| 3 | 2.1s | 0 | `node scripts/check-proof-verifier-contract.mjs --self-test` |
| 8 | 2.0s | 0 | `node scripts/probe-supabase-control-plane.mjs --check` |
| 17 | 1.9s | 0 | `node scripts/check-production-promotion-gate.mjs --check` |
| 13 | 1.9s | 0 | `node scripts/check-capability-discovery-contract.mjs --self-test` |
| 12 | 1.7s | 0 | `node scripts/verify-obelisk-edge-deployment.mjs --self-test` |
| 11 | 1.7s | 0 | `node scripts/verify-supabase-runtime.mjs --self-test` |

## Failures

- Step 20: `node scripts/check-generated-drift-preflight.mjs` exited 1
