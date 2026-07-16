# Build Check Diagnostics

Generated: 2026-07-16T20:01:08.159Z

Latest: **213/213** passed · failed 0 · total 49.6s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 75 | 19.6s | 0 | `node scripts/verify-supply-chain.mjs` |
| 97 | 5.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 53 | 2.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 21 | 1.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 50 | 1.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 179 | 1.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 198 | 0.8s | 0 | `node scripts/crawl-all-pages.mjs` |
| 2 | 0.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 209 | 0.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 144 | 0.5s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |

## Failures

- None.
