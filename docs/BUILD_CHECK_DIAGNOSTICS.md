# Build Check Diagnostics

Generated: 2026-08-07T23:39:31.665Z
Receipt: `2a2c7474a0e9c3de82d6eb59` · coverage 283/283 from step 1

Latest: **283/283** passed · failed 0 · total 336.7s
Concentration: **15.8%** in step 55 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 55 | 53.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 134 | 35.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 28 | 23.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 87 | 15.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 52 | 6.2s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 60 | 4.3s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 90 | 4.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 59 | 3.9s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 23 | 3.9s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 274 | 3.6s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
