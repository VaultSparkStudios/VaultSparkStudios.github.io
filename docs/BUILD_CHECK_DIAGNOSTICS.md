# Build Check Diagnostics

Generated: 2026-09-02T04:23:32.809Z
Receipt: `05028b6d19385d344316fe82` · coverage 379/379 from step 1

Latest: **379/379** passed · failed 0 · total 270.9s
Concentration: **13.6%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 36.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 20.6s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 10.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 236 | 10.1s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 96 | 9.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 296 | 7.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 245 | 7.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 352 | 6.6s | 0 | `node scripts/check-static-csp-routes.mjs` |
| 133 | 5.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 360 | 5.1s | 0 | `node scripts/check-mobile-runtime-contract.mjs` |

## Failures

- None.
