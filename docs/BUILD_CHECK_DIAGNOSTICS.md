# Build Check Diagnostics

Generated: 2026-07-16T23:10:34.365Z

Latest: **215/215** passed · failed 0 · total 59.7s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 76 | 22.5s | 0 | `node scripts/verify-supply-chain.mjs` |
| 98 | 5.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 54 | 2.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 21 | 2.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 51 | 1.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 211 | 1.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 181 | 1.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 200 | 0.8s | 0 | `node scripts/crawl-all-pages.mjs` |
| 145 | 0.7s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |
| 2 | 0.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
