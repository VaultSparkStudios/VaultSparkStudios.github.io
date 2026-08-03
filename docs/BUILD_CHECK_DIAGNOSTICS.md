# Build Check Diagnostics

Generated: 2026-08-03T07:41:51.453Z
Receipt: `6d813e2766447edddb3ebf11` · coverage 269/269 from step 1

Latest: **269/269** passed · failed 0 · total 140.8s
Concentration: **14.9%** in step 122 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 122 | 21.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 43 | 15.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 75 | 5.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 16 | 4.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 78 | 3.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 260 | 3.2s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 100 | 2.1s | 0 | `node scripts/verify-supply-chain.mjs` |
| 215 | 2.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 131 | 1.4s | 0 | `node scripts/check-perf-budget.mjs --source=rum` |
| 11 | 1.3s | 0 | `node scripts/check-capability-discovery-contract.mjs` |

## Failures

- None.
