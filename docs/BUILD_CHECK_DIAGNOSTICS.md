# Build Check Diagnostics

Generated: 2026-08-02T00:27:32.954Z
Receipt: `73e97d2fc59321964351e00b` · coverage 47/267 from step 1

Latest: **46/47** passed · failed 1 · total 152.4s
Concentration: **42.9%** in step 43 · ratchet BREACHED (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 43 | 65.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 16 | 16.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 11 | 4.7s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 47 | 3.7s | 1 | `node scripts/check-startup-meter-freshness.mjs` |
| 36 | 2.4s | 0 | `node scripts/check-play-next-impression-contract.mjs` |
| 22 | 1.9s | 0 | `node scripts/build-worker-route-provenance.mjs --check` |
| 7 | 1.9s | 0 | `node scripts/verify-supabase-runtime.mjs --self-test` |
| 38 | 1.9s | 0 | `node scripts/check-cta-readiness.mjs --self-test` |
| 25 | 1.8s | 0 | `node scripts/build-deploy-currency.mjs --self-test` |
| 37 | 1.8s | 0 | `node scripts/check-cta-impression-contracts.mjs` |

## Failures

- Step 47: `node scripts/check-startup-meter-freshness.mjs` exited 1
