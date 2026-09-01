# Build Check Diagnostics

Generated: 2026-09-01T13:34:46.892Z
Receipt: `870fb9d4e8fdbe3b121cee57` · coverage 79/378 from step 62

Latest: **78/79** passed · failed 1 · total 110.3s
Concentration: **44.4%** in step 140 · ratchet BREACHED (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 48.9s | 1 | `node scripts/check-proof-surface.mjs` |
| 93 | 8.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 96 | 7.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 133 | 3.1s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 97 | 2.3s | 0 | `node scripts/lint-repo.mjs` |
| 65 | 2.0s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 99 | 1.7s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 66 | 1.5s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 98 | 1.4s | 0 | `node scripts/validate-module-imports.mjs` |
| 94 | 1.3s | 0 | `node scripts/check-orphan-shell-assets.mjs --warn-only` |

## Failures

- Step 140: `node scripts/check-proof-surface.mjs` exited 1
