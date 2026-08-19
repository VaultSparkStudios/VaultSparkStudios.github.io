# Build Check Diagnostics

Generated: 2026-08-19T03:07:48.705Z
Receipt: `6ef8bd123587e2704e2f3851` · coverage 319/319 from step 1

Latest: **319/319** passed · failed 0 · total 484.6s
Concentration: **19.4%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 94.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 259 | 44.4s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 27.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 131 | 13.3s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 91 | 11.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 94 | 11.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 292 | 7.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 29 | 6.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 281 | 6.5s | 0 | `node scripts/crawl-all-pages.mjs` |
| 95 | 6.3s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
