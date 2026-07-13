# Build Check Diagnostics

Generated: 2026-07-13T03:51:17.340Z

Latest: **198/198** passed · failed 0 · total 104.9s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 67 | 20.2s | 0 | `node scripts/verify-supply-chain.mjs` |
| 86 | 18.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 7.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 42 | 4.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 2.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 45 | 2.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 196 | 1.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 166 | 1.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 185 | 1.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 25 | 1.0s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
