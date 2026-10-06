# Build Check Diagnostics

Generated: 2026-10-06T16:24:19.266Z
Receipt: `051da09cb288b13f58f32235` · coverage 52/530 from step 1

Latest: **51/52** passed · failed 1 · total 36.5s
Concentration: **12.7%** in step 33 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 33 | 4.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 45 | 3.5s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 44 | 1.6s | 0 | `node scripts/build-oracle-velocity-public.mjs --self-test` |
| 27 | 1.2s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 19 | 1.0s | 0 | `node scripts/probe-supabase-control-plane.mjs --self-test` |
| 46 | 0.9s | 0 | `node scripts/generate-build-sha.mjs --self-test` |
| 26 | 0.8s | 0 | `node scripts/check-obelisk-link-readiness.mjs --self-test` |
| 49 | 0.8s | 0 | `node scripts/build-candidate-artifact-manifest.mjs --self-test` |
| 32 | 0.8s | 0 | `node scripts/build-ignis-platform-status.mjs --check` |
| 25 | 0.8s | 0 | `node scripts/check-capability-discovery-contract.mjs --self-test` |

## Failures

- Step 52: `node scripts/build-ambient-bundle.mjs --check` exited 1
