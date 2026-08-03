# Build Check Diagnostics

Generated: 2026-08-03T22:02:59.322Z
Receipt: `61ecb9e9382ff7807db99275` · coverage 275/275 from step 1

Latest: **275/275** passed · failed 0 · total 183.4s
Concentration: **14.2%** in step 47 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 47 | 26.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 126 | 24.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 79 | 8.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 20 | 4.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 266 | 4.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 82 | 4.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 221 | 2.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 15 | 2.3s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 104 | 2.1s | 0 | `node scripts/verify-supply-chain.mjs` |
| 212 | 2.1s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |

## Failures

- None.
