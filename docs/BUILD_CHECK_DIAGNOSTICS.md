# Build Check Diagnostics

Generated: 2026-07-13T07:56:49.496Z

Latest: **202/202** passed · failed 0 · total 128.6s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 71 | 23.2s | 0 | `node scripts/verify-supply-chain.mjs` |
| 90 | 22.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 10.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 46 | 5.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 200 | 4.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 2 | 3.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 49 | 2.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 170 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 189 | 1.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 83 | 1.1s | 0 | `node scripts/build-geo-vitals.mjs --check` |

## Failures

- None.
