# Build Check Diagnostics

Generated: 2026-08-10T07:07:37.227Z
Receipt: `bbf05f58f08aa774f2c3d675` · coverage 289/289 from step 1

Latest: **289/289** passed · failed 0 · total 455.0s
Concentration: **20.6%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 93.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 42.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 87 | 17.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 280 | 12.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 28 | 7.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 269 | 5.7s | 0 | `node scripts/crawl-all-pages.mjs` |
| 90 | 4.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 52 | 3.9s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 23 | 3.8s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 127 | 3.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |

## Failures

- None.
