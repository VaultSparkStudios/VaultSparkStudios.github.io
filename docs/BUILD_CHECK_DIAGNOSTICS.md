# Build Check Diagnostics

Generated: 2026-09-09T04:47:40.941Z
Receipt: `8ab1e16213ecf89ce803865b` · coverage 390/390 from step 1

Latest: **390/390** passed · failed 0 · total 431.4s
Concentration: **14.1%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 61.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 45.4s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 28.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 93 | 19.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 97 | 15.5s | 0 | `node scripts/lint-repo.mjs` |
| 96 | 14.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 296 | 8.2s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 133 | 7.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 245 | 6.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 58 | 6.0s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- None.
