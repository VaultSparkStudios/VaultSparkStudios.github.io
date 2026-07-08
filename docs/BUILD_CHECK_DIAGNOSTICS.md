# Build Check Diagnostics

Generated: 2026-07-08T06:34:55.019Z

Latest: **186/186** passed · failed 0 · total 106.5s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 64 | 24.9s | 0 | `node scripts/verify-supply-chain.mjs` |
| 83 | 17.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 22 | 7.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 41 | 4.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 3.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 44 | 2.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 173 | 1.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 26 | 1.3s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 76 | 0.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 125 | 0.7s | 0 | `node scripts/analyze-home-lcp.mjs --self-test` |

## Failures

- None.
