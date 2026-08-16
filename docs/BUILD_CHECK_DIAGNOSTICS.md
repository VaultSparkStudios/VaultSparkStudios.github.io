# Build Check Diagnostics

Generated: 2026-08-16T06:03:14.887Z
Receipt: `c633b043d774045834a30d4a` · coverage 302/302 from step 1

Latest: **302/302** passed · failed 0 · total 290.2s
Concentration: **16.1%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 46.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 253 | 26.0s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 55 | 17.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 87 | 7.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 90 | 5.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 236 | 5.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 227 | 4.5s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 234 | 4.4s | 0 | `node scripts/ensure-preconnects.mjs --check` |
| 28 | 4.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 286 | 4.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
