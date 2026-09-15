# Build Check Diagnostics

Generated: 2026-09-15T06:30:19.683Z
Receipt: `aa4b228f72824947395269f3` · coverage 102/495 from step 1

Latest: **101/102** passed · failed 1 · total 49.5s
Concentration: **22.9%** in step 61 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 61 | 11.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 98 | 9.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 94 | 3.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 1.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 58 | 1.6s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 99 | 1.5s | 0 | `node scripts/lint-repo.mjs` |
| 65 | 1.5s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 81 | 1.1s | 0 | `node scripts/check-s151-contracts.mjs` |
| 66 | 0.9s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 100 | 0.9s | 0 | `node scripts/validate-module-imports.mjs` |

## Failures

- Step 102: `node scripts/check-unit-suite-parity.mjs` exited 1
