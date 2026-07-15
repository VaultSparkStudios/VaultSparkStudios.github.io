# Build Check Diagnostics

Generated: 2026-07-15T21:36:57.040Z

Latest: **209/209** passed · failed 0 · total 64.5s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 71 | 23.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 93 | 6.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 2.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 49 | 2.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 46 | 2.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 205 | 1.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 175 | 1.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 194 | 1.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 2 | 0.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 139 | 0.7s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |

## Failures

- None.
