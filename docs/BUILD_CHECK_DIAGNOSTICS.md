# Build Check Diagnostics

Generated: 2026-07-15T20:01:38.586Z

Latest: **207/207** passed · failed 0 · total 140.8s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 71 | 56.0s | 0 | `node scripts/verify-supply-chain.mjs` |
| 205 | 13.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 93 | 9.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 49 | 5.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 21 | 4.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 46 | 3.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 2.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 175 | 2.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 194 | 1.6s | 0 | `node scripts/crawl-all-pages.mjs` |
| 140 | 1.5s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |

## Failures

- None.
