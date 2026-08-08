# Build Check Diagnostics

Generated: 2026-08-08T21:16:29.871Z
Receipt: `35a75c63f21655166fb334d0` · coverage 288/288 from step 1

Latest: **288/288** passed · failed 0 · total 421.1s
Concentration: **24.5%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 103.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 31.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 279 | 12.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 28 | 11.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 87 | 9.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 127 | 8.1s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 268 | 6.8s | 0 | `node scripts/crawl-all-pages.mjs` |
| 52 | 4.5s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 90 | 3.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 119 | 3.3s | 0 | `node scripts/check-mobile-contracts.mjs` |

## Failures

- None.
