# Build Check Diagnostics

Generated: 2026-10-06T11:27:10.646Z
Receipt: `21bd77aabbbbd5179fea2251` · coverage 114/530 from step 1

Latest: **113/114** passed · failed 1 · total 55.9s
Concentration: **16.4%** in step 65 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 65 | 9.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 110 | 7.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 33 | 3.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 106 | 2.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 111 | 1.4s | 0 | `node scripts/lint-repo.mjs` |
| 45 | 1.3s | 0 | `node scripts/build-oracle-velocity-public.mjs --check` |
| 70 | 1.1s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 62 | 0.9s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 69 | 0.8s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 44 | 0.8s | 0 | `node scripts/build-oracle-velocity-public.mjs --self-test` |

## Failures

- Step 114: `node scripts/check-unit-suite-parity.mjs` exited 1
