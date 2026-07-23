# Build Check Diagnostics

Generated: 2026-07-23T04:18:08.742Z

Latest: **88/89** passed · failed 1 · total 22.4s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 21 | 6.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 56 | 5.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 53 | 1.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 0.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 58 | 0.5s | 0 | `node scripts/validate-module-imports.mjs` |
| 57 | 0.4s | 0 | `node scripts/lint-repo.mjs` |
| 85 | 0.3s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 59 | 0.3s | 0 | `node --test tests/worker.unit.spec.js` |
| 26 | 0.2s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 25 | 0.2s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- Step 89: `node scripts/measure-throttled-vitals.mjs --self-test` exited 1
