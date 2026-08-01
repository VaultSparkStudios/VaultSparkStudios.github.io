# Proof Surface Diagnostics

Generated: 2026-08-01T05:19:22.776Z
Receipt: `2c54670b86c63822808c145b` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 35.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 6 | blocking | 1.1s | 0 | `node scripts/check-proof-feed-generators.mjs --self-test` |
| 41 | blocking | 1.0s | 0 | `node scripts/derive-game-index.mjs --check` |
| 39 | blocking | 1.0s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 81 | advisory | 1.0s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs` |
| 35 | blocking | 0.9s | 0 | `node scripts/check-intelligence-hydration.mjs` |
| 42 | blocking | 0.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 80 | advisory | 0.8s | 0 | `node scripts/check-lighthouse-trend.mjs` |
| 38 | blocking | 0.8s | 0 | `node scripts/derive-game-nav.mjs --self-test` |
| 36 | blocking | 0.7s | 0 | `node scripts/build-velocity-series.mjs --self-test` |
| 47 | blocking | 0.7s | 0 | `node scripts/build-vault-momentum.mjs --self-test` |

## Failures

- None.
