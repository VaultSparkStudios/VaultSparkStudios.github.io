# Build Check Diagnostics

Generated: 2026-08-24T02:07:27.871Z
Receipt: `5e4caed1934090fdd84d6927` · coverage 368/368 from step 1

Latest: **368/368** passed · failed 0 · total 668.1s
Concentration: **16.1%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 107.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 60.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 261 | 52.2s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 129 | 26.7s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 341 | 24.9s | 0 | `node scripts/check-orphan-libs.mjs --check` |
| 29 | 14.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 23 | 14.8s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 93 | 11.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 294 | 10.7s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 359 | 10.3s | 0 | `node scripts/check-windows-hide.mjs` |

## Failures

- None.
