# Build Check Diagnostics

Generated: 2026-08-31T09:02:48.240Z
Receipt: `a2451a0ed846c41412ae9221` · coverage 372/372 from step 1

Latest: **372/372** passed · failed 0 · total 640.2s
Concentration: **13.0%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 83.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 72.6s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 26.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 257 | 18.7s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 253 | 17.6s | 0 | `node scripts/check-evidence-graph.mjs` |
| 363 | 15.4s | 0 | `node scripts/check-windows-hide.mjs` |
| 296 | 14.6s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 93 | 14.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 359 | 9.5s | 0 | `node scripts/check-mobile-runtime-contract.mjs` |
| 29 | 8.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
