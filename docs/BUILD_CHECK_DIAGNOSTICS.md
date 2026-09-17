# Build Check Diagnostics

Generated: 2026-09-17T07:09:50.809Z
Receipt: `32cabd2d52423b636f8aa6dd` · coverage 29/495 from step 1

Latest: **28/29** passed · failed 1 · total 4.0s
Concentration: **27.9%** in step 29 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 29 | 1.1s | 1 | `node scripts/check-generated-drift-preflight.mjs` |
| 23 | 0.4s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 8 | 0.1s | 0 | `node scripts/build-proof-aware-projects.mjs --check` |
| 16 | 0.1s | 0 | `node scripts/probe-supabase-control-plane.mjs --check` |
| 2 | 0.1s | 0 | `node scripts/manage-forge-editorial.mjs --check` |
| 12 | 0.1s | 0 | `node scripts/check-proof-verifier-contract.mjs` |
| 27 | 0.1s | 0 | `node scripts/check-lighthouse-trend.mjs --self-test` |
| 19 | 0.1s | 0 | `node scripts/verify-supabase-runtime.mjs --self-test` |
| 5 | 0.1s | 0 | `node scripts/check-startup-context-budget.mjs` |
| 10 | 0.1s | 0 | `node scripts/check-theme-boot-contract.mjs` |

## Failures

- Step 29: `node scripts/check-generated-drift-preflight.mjs` exited 1
