# Proof Surface Diagnostics

Generated: 2026-08-21T17:36:31.713Z
Receipt: `ff4ed33f0dab06188f4c62f7` · coverage 87/87

Latest: **86/87** passed · blocking 70/70 · advisory findings 1/17 · total 76.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 42 | blocking | 2.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 76 | advisory | 2.1s | 0 | `node scripts/build-oracle-query-insights.mjs --check` |
| 84 | advisory | 2.0s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 54 | blocking | 1.9s | 0 | `node scripts/check-decision-currency.mjs --self-test` |
| 83 | advisory | 1.8s | 0 | `node scripts/check-nav-catalog-sync.mjs` |
| 45 | blocking | 1.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 10 | blocking | 1.6s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 9 | blocking | 1.6s | 0 | `node scripts/check-og-images.mjs` |
| 11 | blocking | 1.6s | 0 | `node scripts/build-og-coverage.mjs --check` |
| 12 | blocking | 1.5s | 0 | `node scripts/build-og-cards.mjs --self-test` |

## Failures

- Step 87 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
