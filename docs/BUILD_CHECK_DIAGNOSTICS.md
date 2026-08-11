# Build Check Diagnostics

Generated: 2026-08-11T07:52:26.227Z
Receipt: `9672118ee8b23e31833a3dbc` · coverage 295/295 from step 1

Latest: **295/295** passed · failed 0 · total 1644.9s
Concentration: **8.8%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 145.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 126.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 52 | 70.6s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 123 | 59.5s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 253 | 58.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 259 | 47.9s | 0 | `node scripts/check-page-script-relevance.mjs` |
| 286 | 47.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 275 | 42.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 127 | 39.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 91 | 31.5s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
