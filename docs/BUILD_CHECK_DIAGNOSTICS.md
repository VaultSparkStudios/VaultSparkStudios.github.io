# Build Check Diagnostics

Generated: 2026-08-08T19:07:01.408Z
Receipt: `8f5bfac1478c9f749b9b61bc` · coverage 285/285 from step 1

Latest: **285/285** passed · failed 0 · total 494.7s
Concentration: **17.6%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 87.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 53.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 87 | 12.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 52 | 8.8s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 28 | 8.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 265 | 8.6s | 0 | `node scripts/crawl-all-pages.mjs` |
| 276 | 6.2s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 90 | 6.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 127 | 5.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 60 | 4.7s | 0 | `node scripts/build-shell-assets.mjs --check` |

## Failures

- None.
