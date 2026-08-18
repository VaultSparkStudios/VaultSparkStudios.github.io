# Build Check Diagnostics

Generated: 2026-08-18T04:15:25.808Z
Receipt: `b02024abcf3a651db4e06add` · coverage 127/317 from step 1

Latest: **126/127** passed · failed 1 · total 20.5s
Concentration: **32.1%** in step 94 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 94 | 6.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 59 | 3.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 91 | 0.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 0.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 96 | 0.4s | 0 | `node scripts/validate-module-imports.mjs` |
| 95 | 0.3s | 0 | `node scripts/lint-repo.mjs` |
| 97 | 0.3s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 56 | 0.3s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 64 | 0.3s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 123 | 0.2s | 0 | `node scripts/check-mobile-contracts.mjs` |

## Failures

- Step 127: `node scripts/measure-throttled-vitals.mjs --self-test` exited 1
