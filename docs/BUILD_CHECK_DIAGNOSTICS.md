# Build Check Diagnostics

Generated: 2026-08-18T23:32:17.264Z
Receipt: `c3ea730520c5fe7b48102551` · coverage 319/319 from step 1

Latest: **319/319** passed · failed 0 · total 265.3s
Concentration: **22.0%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 58.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 259 | 23.3s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 15.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 8.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 131 | 7.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 242 | 6.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 91 | 5.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 292 | 5.2s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 29 | 3.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 233 | 2.7s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |

## Failures

- None.
