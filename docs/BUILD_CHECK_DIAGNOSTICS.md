# Build Check Diagnostics

Generated: 2026-09-10T06:00:55.041Z
Receipt: `92a931a8dc0f00f53b2158ef` · coverage 73/479 from step 1

Latest: **72/73** passed · failed 1 · total 20.1s
Concentration: **37.6%** in step 61 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 61 | 7.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 29 | 1.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 58 | 0.9s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 66 | 0.7s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 65 | 0.6s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 41 | 0.5s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 23 | 0.4s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 40 | 0.4s | 0 | `node scripts/build-oracle-velocity-public.mjs --self-test` |
| 42 | 0.2s | 0 | `node scripts/generate-build-sha.mjs --self-test` |
| 63 | 0.2s | 0 | `node scripts/check-lighthouse-route-tiers.mjs` |

## Failures

- Step 73: `node scripts/build-release-proof.mjs --check` exited 1
