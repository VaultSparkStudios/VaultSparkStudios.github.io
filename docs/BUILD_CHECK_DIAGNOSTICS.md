# Build Check Diagnostics

Generated: 2026-09-03T04:38:48.073Z
Receipt: `42d406b304dd0ee4a647414b` · coverage 388/388 from step 1

Latest: **388/388** passed · failed 0 · total 182.3s
Concentration: **14.5%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 26.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 23.7s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 10.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 8.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 245 | 4.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 133 | 4.3s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 93 | 3.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 285 | 2.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 296 | 2.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 236 | 1.8s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |

## Failures

- None.
