# Proof Surface Diagnostics

Generated: 2026-07-31T21:31:48.088Z
Receipt: `74bfe1f71fb81651fd8e334b` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 116.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 39 | blocking | 4.1s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 42 | blocking | 3.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 79 | advisory | 2.9s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 81 | advisory | 2.7s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs` |
| 38 | blocking | 2.7s | 0 | `node scripts/derive-game-nav.mjs --self-test` |
| 46 | blocking | 2.6s | 0 | `node scripts/check-feed-publisher-manifest.mjs --check` |
| 51 | blocking | 2.5s | 0 | `node scripts/check-decision-currency.mjs --self-test` |
| 44 | blocking | 2.3s | 0 | `node scripts/check-trust-feed-freshness.mjs` |
| 50 | blocking | 2.2s | 0 | `node scripts/check-journal-dates.mjs` |
| 40 | blocking | 2.2s | 0 | `node scripts/derive-game-index.mjs --self-test` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
