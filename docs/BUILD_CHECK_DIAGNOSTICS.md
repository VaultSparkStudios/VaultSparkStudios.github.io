# Build Check Diagnostics

Generated: 2026-09-01T12:56:44.915Z
Receipt: `95c988328b247600fe0b380e` · coverage 79/378 from step 62

Latest: **78/79** passed · failed 1 · total 117.9s
Concentration: **44.8%** in step 140 · ratchet BREACHED (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 52.8s | 1 | `node scripts/check-proof-surface.mjs` |
| 93 | 8.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 96 | 7.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 133 | 3.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 97 | 3.0s | 0 | `node scripts/lint-repo.mjs` |
| 117 | 2.1s | 0 | `node scripts/check-sri.mjs` |
| 98 | 1.8s | 0 | `node scripts/validate-module-imports.mjs` |
| 66 | 1.6s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 125 | 1.5s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 65 | 1.4s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- Step 140: `node scripts/check-proof-surface.mjs` exited 1
