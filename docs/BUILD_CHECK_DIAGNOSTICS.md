# Build Check Diagnostics

Generated: 2026-09-04T17:35:44.658Z
Receipt: `af4135d0cb32d40215eff4d4` · coverage 388/388 from step 1

Latest: **388/388** passed · failed 0 · total 394.5s
Concentration: **10.0%** in step 373 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 373 | 39.5s | 0 | `node scripts/check-windows-hide.mjs` |
| 140 | 32.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 26.8s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 375 | 21.2s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 384 | 18.5s | 0 | `node scripts/check-site-integrity.mjs` |
| 61 | 13.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 360 | 11.9s | 0 | `node scripts/check-mobile-runtime-contract.mjs` |
| 367 | 10.6s | 0 | `node scripts/check-verification-origin-publisher.mjs` |
| 369 | 8.4s | 0 | `node scripts/check-receipt-roundtrip-coverage.mjs` |
| 96 | 8.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |

## Failures

- None.
