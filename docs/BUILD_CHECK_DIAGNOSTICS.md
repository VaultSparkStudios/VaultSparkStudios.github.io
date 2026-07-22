# Build Check Diagnostics

Generated: 2026-07-22T04:31:34.556Z

Latest: **88/89** passed · failed 1 · total 16.9s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 21 | 4.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 56 | 4.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 53 | 0.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 0.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 58 | 0.4s | 0 | `node scripts/validate-module-imports.mjs` |
| 57 | 0.3s | 0 | `node scripts/lint-repo.mjs` |
| 59 | 0.3s | 0 | `node --test tests/worker.unit.spec.js` |
| 85 | 0.3s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 26 | 0.2s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 62 | 0.2s | 0 | `node scripts/validate-supabase-queries.mjs --check` |

## Failures

- Step 89: `node scripts/measure-throttled-vitals.mjs --self-test` exited 1
