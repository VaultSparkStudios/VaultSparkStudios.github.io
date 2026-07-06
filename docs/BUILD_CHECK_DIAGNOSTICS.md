# Build Check Diagnostics

Generated: 2026-07-06T05:48:30.526Z

Latest: **171/171** passed · failed 0 · total 204.2s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 57 | 31.7s | 0 | `node scripts/verify-supply-chain.mjs` |
| 76 | 29.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 19 | 22.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 34 | 12.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 37 | 4.0s | 0 | `node scripts/check-orphan-assets.mjs` |
| 2 | 2.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 40 | 2.4s | 0 | `node --test tests/worker.unit.spec.js` |
| 38 | 2.2s | 0 | `node scripts/lint-repo.mjs` |
| 45 | 1.9s | 0 | `node scripts/verify-push-contract.mjs` |
| 33 | 1.9s | 0 | `node scripts/generate-founder-presence.mjs --check` |

## Failures

- None.
