# Build Check Diagnostics

Generated: 2026-09-01T06:58:29.931Z
Receipt: `73c678bf1c17aec7aa518ed8` · coverage 56/378 from step 1

Latest: **55/56** passed · failed 1 · total 45.7s
Concentration: **17.9%** in step 29 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 29 | 8.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 23 | 4.8s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 41 | 2.3s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 37 | 1.8s | 0 | `node scripts/build-worker-route-history.mjs --check` |
| 25 | 1.5s | 0 | `node scripts/check-production-promotion-gate.mjs --self-test` |
| 48 | 1.4s | 0 | `node scripts/build-ambient-bundle.mjs --check` |
| 40 | 1.2s | 0 | `node scripts/build-oracle-velocity-public.mjs --self-test` |
| 24 | 1.0s | 0 | `node scripts/check-promotion-scope.mjs --self-test` |
| 26 | 1.0s | 0 | `node scripts/check-production-promotion-gate.mjs --check` |
| 17 | 0.9s | 0 | `node scripts/build-identity-migration-receipt.mjs --self-test` |

## Failures

- Step 56: `node scripts/check-cta-readiness.mjs --self-test` exited 1
