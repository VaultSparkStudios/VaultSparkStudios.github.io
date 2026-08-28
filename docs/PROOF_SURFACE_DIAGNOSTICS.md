# Proof Surface Diagnostics

Generated: 2026-08-28T07:38:37.553Z
Receipt: `7d34f86b197e2c23c51284f7` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 157.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 5 | blocking | 3.3s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |
| 60 | blocking | 3.3s | 0 | `node scripts/build-leaderboard-subpages.mjs --check` |
| 54 | blocking | 3.0s | 0 | `node scripts/check-journal-dates.mjs --self-test` |
| 55 | blocking | 3.0s | 0 | `node scripts/check-journal-dates.mjs` |
| 64 | blocking | 2.9s | 0 | `node scripts/build-oracle-answers.mjs --self-test` |
| 61 | blocking | 2.9s | 0 | `node scripts/check-sitemap-coverage.mjs` |
| 53 | blocking | 2.8s | 0 | `node scripts/build-vault-momentum.mjs --check` |
| 47 | blocking | 2.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 2.5s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 50 | blocking | 2.4s | 0 | `node scripts/check-feed-publisher-manifest.mjs --self-test` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
