# Build Check Diagnostics

Generated: 2026-07-13T03:54:32.255Z

Latest: **198/198** passed · failed 0 · total 104.6s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 67 | 20.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 86 | 17.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 7.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 42 | 4.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 2.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 45 | 2.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 196 | 1.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 166 | 1.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 185 | 1.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 25 | 0.7s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
