# Build Check Diagnostics

Generated: 2026-09-01T12:52:39.700Z
Receipt: `e13cb4ac680a8706bb928422` · coverage 79/378 from step 62

Latest: **78/79** passed · failed 1 · total 84.0s
Concentration: **27.9%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 23.4s | 1 | `node scripts/check-proof-surface.mjs` |
| 93 | 7.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 96 | 6.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 133 | 3.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 97 | 3.2s | 0 | `node scripts/lint-repo.mjs` |
| 63 | 1.9s | 0 | `node scripts/check-lighthouse-route-tiers.mjs` |
| 98 | 1.3s | 0 | `node scripts/validate-module-imports.mjs` |
| 65 | 1.3s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 76 | 1.2s | 0 | `node scripts/check-home-critical-css-contract.mjs --self-test` |
| 122 | 1.2s | 0 | `node scripts/check-render-contracts.mjs` |

## Failures

- Step 140: `node scripts/check-proof-surface.mjs` exited 1
