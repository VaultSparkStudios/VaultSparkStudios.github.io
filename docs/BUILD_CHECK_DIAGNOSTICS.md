# Build Check Diagnostics

Generated: 2026-07-14T08:07:20.729Z

Latest: **204/204** passed · failed 0 · total 184.8s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 92 | 35.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 71 | 26.2s | 0 | `node scripts/verify-supply-chain.mjs` |
| 21 | 11.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 46 | 6.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 4.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 49 | 2.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 191 | 2.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 202 | 1.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 128 | 1.7s | 0 | `node scripts/build-nervous-system.mjs --check` |
| 121 | 1.7s | 0 | `node scripts/build-inp-soak-verdicts.mjs --self-test` |

## Failures

- None.
