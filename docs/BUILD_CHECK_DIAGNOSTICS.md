# Build Check Diagnostics

Generated: 2026-09-01T13:38:16.772Z
Receipt: `6d75f10ce5c4152519611beb` · coverage 145/378 from step 62

Latest: **144/145** passed · failed 1 · total 157.4s
Concentration: **44.7%** in step 140 · ratchet BREACHED (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 70.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 93 | 6.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 96 | 6.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 133 | 4.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 97 | 3.0s | 0 | `node scripts/lint-repo.mjs` |
| 99 | 1.8s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |
| 98 | 1.6s | 0 | `node scripts/validate-module-imports.mjs` |
| 65 | 1.6s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 118 | 1.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 94 | 1.3s | 0 | `node scripts/check-orphan-shell-assets.mjs --warn-only` |

## Failures

- Step 206: `node scripts/check-closeout-boundary.mjs` exited 1
