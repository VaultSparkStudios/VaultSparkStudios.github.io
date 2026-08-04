# Build Check Diagnostics

Generated: 2026-08-04T04:25:37.037Z
Receipt: `736a4a0dde85d7c280e114be` · coverage 115/275 from step 1

Latest: **114/115** passed · failed 1 · total 26.2s
Concentration: **25.5%** in step 47 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 47 | 6.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 82 | 6.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 20 | 0.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 79 | 0.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 84 | 0.6s | 0 | `node scripts/validate-module-imports.mjs` |
| 83 | 0.5s | 0 | `node scripts/lint-repo.mjs` |
| 85 | 0.4s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 111 | 0.3s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 80 | 0.3s | 0 | `node scripts/check-orphan-shell-assets.mjs --warn-only` |
| 52 | 0.3s | 0 | `node scripts/build-shell-assets.mjs --check` |

## Failures

- Step 115: `node scripts/measure-throttled-vitals.mjs --self-test` exited 1
