# Build Check Diagnostics

Generated: 2026-08-17T17:37:47.789Z
Receipt: `352dc26442868760a27e7687` · coverage 309/309 from step 1

Latest: **309/309** passed · failed 0 · total 248.6s
Concentration: **19.0%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 47.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 253 | 28.1s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 55 | 17.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 87 | 7.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 90 | 5.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 28 | 4.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 227 | 3.7s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 236 | 2.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 286 | 2.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 52 | 2.4s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- None.
