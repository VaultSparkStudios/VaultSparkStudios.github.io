# Build Check Diagnostics

Generated: 2026-10-07T14:01:12.352Z
Receipt: `dab4f602df50ccdc40bf72e0` · coverage 93/530 from step 1

Latest: **92/93** passed · failed 1 · total 97.8s
Concentration: **15.9%** in step 65 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 65 | 15.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 33 | 5.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 88 | 3.4s | 0 | `node scripts/derive-registry-surfaces.mjs --self-test` |
| 91 | 3.2s | 0 | `node scripts/build-api-index.mjs --check` |
| 70 | 2.5s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 85 | 2.4s | 0 | `node scripts/check-s151-contracts.mjs` |
| 69 | 1.9s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 83 | 1.6s | 0 | `node scripts/check-critical-shell-geometry.mjs` |
| 27 | 1.6s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 80 | 1.6s | 0 | `node scripts/check-home-critical-css-contract.mjs --self-test` |

## Failures

- Step 93: `node scripts/build-sitemap-page.mjs --check` exited 1
