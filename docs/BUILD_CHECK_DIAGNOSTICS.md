# Build Check Diagnostics

Generated: 2026-09-10T17:15:01.392Z
Receipt: `e7f3a9049b69659465d02bf9` · coverage 142/479 from step 1

Latest: **141/142** passed · failed 1 · total 116.0s
Concentration: **18.2%** in step 61 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 61 | 21.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 98 | 15.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 142 | 15.3s | 1 | `node scripts/check-proof-surface.mjs` |
| 95 | 5.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 100 | 4.5s | 0 | `node scripts/validate-module-imports.mjs` |
| 99 | 2.6s | 0 | `node scripts/lint-repo.mjs` |
| 58 | 2.5s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 101 | 2.0s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 29 | 1.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 66 | 1.5s | 0 | `node scripts/build-shell-assets.mjs --check` |

## Failures

- Step 142: `node scripts/check-proof-surface.mjs` exited 1
