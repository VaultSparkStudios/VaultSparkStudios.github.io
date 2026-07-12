# Build Check Diagnostics

Generated: 2026-07-12T23:03:06.131Z

Latest: **195/195** passed · failed 0 · total 106.4s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 67 | 21.1s | 0 | `node scripts/verify-supply-chain.mjs` |
| 86 | 18.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 7.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 42 | 4.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 2.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 45 | 2.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 163 | 1.3s | 0 | `node scripts/check-orphan-scripts.mjs --warn-only` |
| 193 | 1.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 182 | 1.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 25 | 1.0s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
