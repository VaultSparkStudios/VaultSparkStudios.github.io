# Build Check Diagnostics

Generated: 2026-09-03T02:19:17.731Z
Receipt: `5660ff9f537cb416bf299b3d` · coverage 388/388 from step 1

Latest: **388/388** passed · failed 0 · total 199.5s
Concentration: **13.8%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 27.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 19.7s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 18.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 8.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 245 | 4.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 296 | 4.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 58 | 3.4s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 133 | 3.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 93 | 3.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 285 | 2.6s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
