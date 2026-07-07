# Build Check Diagnostics

Generated: 2026-07-07T03:28:51.768Z

Latest: **181/181** passed · failed 0 · total 280.9s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 80 | 66.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 37.8s | 0 | `node scripts/verify-supply-chain.mjs` |
| 21 | 20.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 38 | 15.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 6.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 44 | 3.2s | 0 | `node --test tests/worker.unit.spec.js` |
| 41 | 2.8s | 0 | `node scripts/check-orphan-assets.mjs` |
| 23 | 2.4s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 146 | 2.4s | 0 | `node scripts/check-longtail-visual-proof.mjs --self-test` |
| 45 | 2.4s | 0 | `node scripts/validate-contracts.mjs --check` |

## Failures

- None.
