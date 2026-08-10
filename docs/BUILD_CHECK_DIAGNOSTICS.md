# Build Check Diagnostics

Generated: 2026-08-10T05:42:51.279Z
Receipt: `593a71736b2edaf67ba3acce` · coverage 289/289 from step 1

Latest: **289/289** passed · failed 0 · total 480.1s
Concentration: **14.5%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 69.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 46.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 280 | 18.6s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 28 | 9.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 269 | 9.5s | 0 | `node scripts/crawl-all-pages.mjs` |
| 87 | 7.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 127 | 4.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 52 | 4.6s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 259 | 4.4s | 0 | `node scripts/build-status-proof.mjs --check` |
| 178 | 3.9s | 0 | `node scripts/build-intelligence-budget.mjs --self-test` |

## Failures

- None.
