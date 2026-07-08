# Build Check Diagnostics

Generated: 2026-07-08T05:31:16.946Z

Latest: **186/186** passed · failed 0 · total 139.7s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 64 | 24.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 83 | 23.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 22 | 10.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 41 | 5.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 2.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 44 | 2.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 164 | 2.0s | 0 | `node scripts/check-protocol-scripts.mjs --info` |
| 113 | 1.4s | 0 | `node scripts/build-inp-soak-verdicts.mjs --check` |
| 173 | 1.4s | 0 | `node scripts/crawl-all-pages.mjs` |
| 115 | 1.3s | 0 | `node scripts/inject-pre-paint-stage.mjs --check` |

## Failures

- None.
