# Build Check Diagnostics

Generated: 2026-08-01T07:47:00.315Z
Receipt: `80ff05584cd053a1e28e02ab` · coverage 267/267 from step 1

Latest: **267/267** passed · failed 0 · total 284.1s
Concentration: **21.7%** in step 122 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 122 | 61.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 43 | 27.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 16 | 5.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 75 | 4.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 78 | 3.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 215 | 3.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 113 | 2.6s | 0 | `node scripts/pull-rum-summary.mjs --check` |
| 116 | 2.5s | 0 | `node scripts/build-analytics-summary.mjs --self-test` |
| 247 | 2.4s | 0 | `node scripts/crawl-all-pages.mjs` |
| 47 | 2.3s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
