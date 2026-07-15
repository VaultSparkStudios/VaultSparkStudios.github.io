# Build Check Diagnostics

Generated: 2026-07-15T21:31:25.995Z

Latest: **209/209** passed · failed 0 · total 66.5s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 71 | 23.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 93 | 7.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 49 | 2.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 21 | 2.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 46 | 2.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 175 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 205 | 1.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 2 | 1.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 194 | 0.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 140 | 0.9s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |

## Failures

- None.
