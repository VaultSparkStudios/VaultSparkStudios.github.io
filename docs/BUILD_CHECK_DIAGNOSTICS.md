# Build Check Diagnostics

Generated: 2026-09-14T07:49:55.153Z
Receipt: `f643bc5f2f203d6e84a3b55b` · coverage 487/487 from step 1

Latest: **487/487** passed · failed 0 · total 682.0s
Concentration: **16.9%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 115.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 29.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 100 | 20.8s | 0 | `node scripts/lint-repo.mjs` |
| 29 | 19.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 375 | 17.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 95 | 17.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 99 | 15.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 66 | 11.9s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 130 | 11.7s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 121 | 10.3s | 0 | `node scripts/csp-audit.mjs` |

## Failures

- None.
