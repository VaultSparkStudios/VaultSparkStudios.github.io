# Build Check Diagnostics

Generated: 2026-08-17T03:44:03.813Z
Receipt: `7f5c5ab213e177fae433c208` · coverage 123/302 from step 1

Latest: **122/123** passed · failed 1 · total 27.7s
Concentration: **28.5%** in step 90 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 90 | 7.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 55 | 6.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 87 | 0.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 28 | 0.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 92 | 0.6s | 0 | `node scripts/validate-module-imports.mjs` |
| 91 | 0.4s | 0 | `node scripts/lint-repo.mjs` |
| 119 | 0.4s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 93 | 0.4s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 52 | 0.4s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 60 | 0.3s | 0 | `node scripts/build-shell-assets.mjs --check` |

## Failures

- Step 123: `node scripts/measure-throttled-vitals.mjs --self-test` exited 1
