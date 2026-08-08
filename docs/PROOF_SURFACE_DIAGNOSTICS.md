# Proof Surface Diagnostics

Generated: 2026-08-08T23:35:21.513Z
Receipt: `9002c90ee59bb5172e73cac9` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 42.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.8s | 0 | `node scripts/check-feed-publisher-manifest.mjs --check` |
| 42 | blocking | 1.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 1 | blocking | 1.5s | 0 | `node scripts/build-public-status.mjs --self-test` |
| 37 | blocking | 1.5s | 0 | `node scripts/check-intelligence-hydration.mjs --self-test` |
| 34 | blocking | 1.4s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 82 | advisory | 1.3s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 7 | blocking | 1.1s | 0 | `node scripts/check-proof-feed-generators.mjs` |
| 45 | blocking | 1.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 31 | blocking | 1.0s | 0 | `node scripts/check-registry-freshness.mjs --self-test` |
| 12 | blocking | 0.9s | 0 | `node scripts/build-og-cards.mjs --self-test` |

## Failures

- None.
