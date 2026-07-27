# Build Check Diagnostics

Generated: 2026-07-27T10:31:12.481Z

Latest: **244/244** passed · failed 0 · total 146.4s
Concentration: **9.7%** in step 108 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 108 | 14.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 86 | 12.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 29 | 12.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 61 | 9.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 64 | 6.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 66 | 4.0s | 0 | `node scripts/validate-module-imports.mjs` |
| 33 | 2.9s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 65 | 2.8s | 0 | `node scripts/lint-repo.mjs` |
| 62 | 2.7s | 0 | `node scripts/check-orphan-shell-assets.mjs --warn-only` |
| 71 | 2.6s | 0 | `node scripts/verify-annual-checkout-contract.mjs` |

## Failures

- None.
