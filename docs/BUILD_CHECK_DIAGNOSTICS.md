# Build Check Diagnostics

Generated: 2026-08-19T19:29:13.254Z
Receipt: `d9f73093bef71dc6c64ed05e` · coverage 319/319 from step 1

Latest: **319/319** passed · failed 0 · total 214.2s
Concentration: **17.6%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 37.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 259 | 21.0s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 15.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 7.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 5.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 292 | 4.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 131 | 3.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 242 | 3.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 3.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 233 | 3.1s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |

## Failures

- None.
