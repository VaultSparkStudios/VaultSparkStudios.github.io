# Build Check Diagnostics

Generated: 2026-09-01T13:00:01.552Z
Receipt: `af51e7eaac68221420c55f31` · coverage 109/378 from step 62

Latest: **108/109** passed · failed 1 · total 161.7s
Concentration: **51.2%** in step 140 · ratchet BREACHED (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 82.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 93 | 9.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 96 | 6.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 133 | 5.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 97 | 2.4s | 0 | `node scripts/lint-repo.mjs` |
| 118 | 1.7s | 0 | `node scripts/verify-supply-chain.mjs` |
| 98 | 1.7s | 0 | `node scripts/validate-module-imports.mjs` |
| 125 | 1.7s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 66 | 1.6s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 155 | 1.4s | 0 | `node scripts/build-entity-graph.mjs --check` |

## Failures

- Step 170: `node scripts/build-ship-receipts.mjs --check` exited 1
