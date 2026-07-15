# Build Check Diagnostics

Generated: 2026-07-15T21:41:32.507Z

Latest: **209/209** passed · failed 0 · total 81.0s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 71 | 34.7s | 0 | `node scripts/verify-supply-chain.mjs` |
| 93 | 7.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 2.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 49 | 2.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 46 | 2.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 205 | 1.7s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 175 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 194 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 2 | 1.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 137 | 0.8s | 0 | `node scripts/analyze-home-lcp.mjs --self-test` |

## Failures

- None.
