# Build Check Diagnostics

Generated: 2026-08-03T03:19:07.323Z
Receipt: `6832e863f1a814f2a9c095b6` · coverage 111/269 from step 1

Latest: **110/111** passed · failed 1 · total 17.2s
Concentration: **25.4%** in step 78 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 78 | 4.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 43 | 3.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 75 | 0.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 16 | 0.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 80 | 0.4s | 0 | `node scripts/validate-module-imports.mjs` |
| 81 | 0.3s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 79 | 0.3s | 0 | `node scripts/lint-repo.mjs` |
| 107 | 0.2s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 48 | 0.2s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 47 | 0.2s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- Step 111: `node scripts/measure-throttled-vitals.mjs --self-test` exited 1
