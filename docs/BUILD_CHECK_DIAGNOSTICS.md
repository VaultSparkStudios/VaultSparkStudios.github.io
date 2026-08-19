# Build Check Diagnostics

Generated: 2026-08-19T18:37:24.697Z
Receipt: `b6b651076070531b878dcc87` · coverage 319/319 from step 1

Latest: **319/319** passed · failed 0 · total 200.7s
Concentration: **18.0%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 36.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 259 | 19.5s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 15.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 7.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 4.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 242 | 3.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 131 | 3.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 29 | 3.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 233 | 3.0s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 281 | 2.6s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
