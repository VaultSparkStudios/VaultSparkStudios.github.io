# Build Check Diagnostics

Generated: 2026-07-26T22:41:16.149Z

Latest: **241/241** passed · failed 0 · total 182.7s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 86 | 73.2s | 0 | `node scripts/verify-supply-chain.mjs` |
| 29 | 13.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 108 | 12.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 9.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 64 | 5.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 2 | 2.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 67 | 2.2s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 66 | 2.0s | 0 | `node scripts/validate-module-imports.mjs` |
| 197 | 1.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 65 | 1.7s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
