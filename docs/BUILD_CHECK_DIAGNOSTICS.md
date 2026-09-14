# Build Check Diagnostics

Generated: 2026-09-14T08:22:01.993Z
Receipt: `ace02b3d6493c7b763101993` · coverage 487/487 from step 1

Latest: **487/487** passed · failed 0 · total 277.2s
Concentration: **12.9%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 35.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 20.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 375 | 12.0s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 99 | 9.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 95 | 7.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 262 | 5.5s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 250 | 4.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 4.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 100 | 3.9s | 0 | `node scripts/lint-repo.mjs` |
| 386 | 3.4s | 0 | `node scripts/check-build-gate-reachability.mjs` |

## Failures

- None.
