# Build Check Diagnostics

Generated: 2026-08-10T15:27:10.578Z
Receipt: `49ce64c698d732631baa5f82` · coverage 291/291 from step 1

Latest: **291/291** passed · failed 0 · total 617.7s
Concentration: **23.7%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 146.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 249 | 40.3s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 55 | 34.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 87 | 10.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 234 | 9.5s | 0 | `node scripts/check-public-safe-tracking.mjs` |
| 28 | 7.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 90 | 5.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 121 | 5.6s | 0 | `node scripts/check-ambient-placement.mjs` |
| 159 | 5.4s | 0 | `node scripts/report-ambient-coverage.mjs --check` |
| 271 | 5.3s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
