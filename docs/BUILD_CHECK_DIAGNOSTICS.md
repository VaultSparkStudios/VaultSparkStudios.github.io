# Build Check Diagnostics

Generated: 2026-07-15T01:56:35.665Z

Latest: **207/207** passed · failed 0 · total 272.8s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 21 | 36.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 93 | 28.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 71 | 25.2s | 0 | `node scripts/verify-supply-chain.mjs` |
| 46 | 17.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 13.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 25 | 4.0s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 49 | 3.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 194 | 3.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 26 | 2.4s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 205 | 2.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
