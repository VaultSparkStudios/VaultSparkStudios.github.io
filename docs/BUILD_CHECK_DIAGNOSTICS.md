# Build Check Diagnostics

Generated: 2026-07-15T21:33:59.850Z

Latest: **209/209** passed · failed 0 · total 75.7s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 71 | 24.0s | 0 | `node scripts/verify-supply-chain.mjs` |
| 93 | 6.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 49 | 2.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 21 | 2.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 175 | 2.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 46 | 2.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 194 | 2.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 205 | 1.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 139 | 0.8s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |
| 2 | 0.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
