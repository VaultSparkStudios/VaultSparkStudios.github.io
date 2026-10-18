# Build Check Diagnostics

Generated: 2026-10-18T17:23:44.848Z
Receipt: `28b594c89d7b5fc2883d0a99` · coverage 41/541 from step 1

Latest: **40/41** passed · failed 1 · total 33.8s
Concentration: **18.1%** in step 41 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 41 | 6.1s | 1 | `node scripts/check-generated-drift-preflight.mjs` |
| 5 | 5.8s | 0 | `node --test tests/s371-release-maintenance.unit.spec.mjs tests/s372-redirect-chains.unit.spec.mjs tests/s373-guards.unit.spec.mjs tests/s373-pages-redirects.unit.spec.mjs` |
| 35 | 2.2s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 2 | 1.1s | 0 | `node --test tests/csp-reports.unit.spec.mjs` |
| 16 | 1.0s | 0 | `node scripts/build-spark-manifest.mjs --check` |
| 3 | 1.0s | 0 | `node --test tests/tt-storage.unit.spec.mjs` |
| 18 | 1.0s | 0 | `node scripts/check-startup-context-budget.mjs` |
| 9 | 0.8s | 0 | `node scripts/desk-art-autopilot.mjs --self-test` |
| 10 | 0.7s | 0 | `node scripts/repair-evidence-graph.mjs --self-test` |
| 27 | 0.7s | 0 | `node scripts/probe-supabase-control-plane.mjs --self-test` |

## Failures

- Step 41: `node scripts/check-generated-drift-preflight.mjs` exited 1
