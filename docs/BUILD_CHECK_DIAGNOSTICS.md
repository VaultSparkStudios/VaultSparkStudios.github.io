# Build Check Diagnostics

Generated: 2026-10-18T14:25:16.681Z
Receipt: `c5ddae20139f1000917af292` · coverage 45/539 from step 1

Latest: **44/45** passed · failed 1 · total 60.0s
Concentration: **18.2%** in step 39 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 39 | 10.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 3 | 6.1s | 0 | `node --test tests/s371-release-maintenance.unit.spec.mjs tests/s372-redirect-chains.unit.spec.mjs tests/s373-guards.unit.spec.mjs tests/s373-pages-redirects.unit.spec.mjs` |
| 33 | 4.5s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 1 | 2.3s | 0 | `node --test tests/tt-storage.unit.spec.mjs` |
| 36 | 1.9s | 0 | `node scripts/check-production-promotion-gate.mjs --check` |
| 7 | 1.3s | 0 | `node scripts/desk-art-autopilot.mjs --self-test` |
| 26 | 1.3s | 0 | `node scripts/probe-supabase-control-plane.mjs --check` |
| 11 | 1.3s | 0 | `node scripts/manage-forge-editorial.mjs --check` |
| 35 | 1.3s | 0 | `node scripts/check-production-promotion-gate.mjs --self-test` |
| 18 | 1.2s | 0 | `node scripts/build-proof-aware-projects.mjs --check` |

## Failures

- Step 45: `node scripts/build-worker-route-provenance.mjs --check` exited 1
