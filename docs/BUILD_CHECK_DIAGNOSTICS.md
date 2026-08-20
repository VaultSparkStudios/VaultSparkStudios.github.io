# Build Check Diagnostics

Generated: 2026-08-20T04:17:49.076Z
Receipt: `cf4cf7b1527dc4b16c6c93b9` · coverage 127/319 from step 1

Latest: **126/127** passed · failed 1 · total 29.3s
Concentration: **27.4%** in step 94 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 94 | 8.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 59 | 7.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 91 | 1.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 0.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 96 | 0.6s | 0 | `node scripts/validate-module-imports.mjs` |
| 95 | 0.5s | 0 | `node scripts/lint-repo.mjs` |
| 56 | 0.4s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 97 | 0.4s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 123 | 0.3s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 64 | 0.3s | 0 | `node scripts/build-shell-assets.mjs --check` |

## Failures

- Step 127: `node scripts/measure-throttled-vitals.mjs --self-test` exited 1
