# Build Check Diagnostics

Generated: 2026-08-16T05:24:18.432Z
Receipt: `a80552c3d5d4a55434ac5d4a` · coverage 302/302 from step 1

Latest: **302/302** passed · failed 0 · total 538.1s
Concentration: **19.5%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 105.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 33.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 253 | 26.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 286 | 16.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 91 | 12.7s | 0 | `node scripts/lint-repo.mjs` |
| 87 | 12.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 119 | 9.5s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 28 | 7.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 90 | 6.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 227 | 5.5s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |

## Failures

- None.
