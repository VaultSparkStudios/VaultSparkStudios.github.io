# Build Check Diagnostics

Generated: 2026-09-03T07:50:10.826Z
Receipt: `a519449372012b72f89d384b` · coverage 388/388 from step 1

Latest: **388/388** passed · failed 0 · total 284.3s
Concentration: **18.4%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 52.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 28.2s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 16.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 10.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 245 | 6.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 93 | 5.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 4.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 58 | 2.8s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 257 | 2.6s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 23 | 2.6s | 0 | `node scripts/check-capability-discovery-contract.mjs` |

## Failures

- None.
