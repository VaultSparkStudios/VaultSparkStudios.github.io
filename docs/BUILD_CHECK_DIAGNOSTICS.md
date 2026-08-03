# Build Check Diagnostics

Generated: 2026-08-03T04:15:47.084Z
Receipt: `0ed3108633f6df8796428c09` · coverage 111/269 from step 1

Latest: **110/111** passed · failed 1 · total 25.5s
Concentration: **26.0%** in step 78 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 78 | 6.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 43 | 6.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 75 | 1.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 16 | 0.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 80 | 0.5s | 0 | `node scripts/validate-module-imports.mjs` |
| 79 | 0.4s | 0 | `node scripts/lint-repo.mjs` |
| 81 | 0.4s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 107 | 0.3s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 48 | 0.3s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 47 | 0.2s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- Step 111: `node scripts/measure-throttled-vitals.mjs --self-test` exited 1
