# Build Check Diagnostics

Generated: 2026-09-13T05:32:48.286Z
Receipt: `441e4ee8a6f6b73e64cf025e` · coverage 132/481 from step 1

Latest: **131/132** passed · failed 1 · total 24.0s
Concentration: **29.2%** in step 99 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 99 | 7.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 5.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 95 | 0.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 102 | 0.6s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js` |
| 29 | 0.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 100 | 0.4s | 0 | `node scripts/lint-repo.mjs` |
| 58 | 0.4s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 101 | 0.4s | 0 | `node scripts/validate-module-imports.mjs` |
| 66 | 0.3s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 128 | 0.3s | 0 | `node scripts/check-mobile-contracts.mjs` |

## Failures

- Step 132: `node scripts/measure-throttled-vitals.mjs --self-test` exited 1
