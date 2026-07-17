# Build Check Diagnostics

Generated: 2026-07-17T00:35:30.729Z

Latest: **215/215** passed · failed 0 · total 120.8s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 76 | 36.1s | 0 | `node scripts/verify-supply-chain.mjs` |
| 98 | 10.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 8.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 51 | 5.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 54 | 4.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 2 | 2.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 181 | 2.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 26 | 1.8s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 146 | 1.7s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |
| 55 | 1.7s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
