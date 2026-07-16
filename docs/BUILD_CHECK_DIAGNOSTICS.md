# Build Check Diagnostics

Generated: 2026-07-16T17:53:13.420Z

Latest: **213/213** passed · failed 0 · total 63.3s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 75 | 27.0s | 0 | `node scripts/verify-supply-chain.mjs` |
| 97 | 5.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 53 | 2.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 21 | 1.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 179 | 1.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 50 | 1.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 209 | 1.2s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 198 | 1.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 90 | 0.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 143 | 0.8s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |

## Failures

- None.
