# Proof Surface Diagnostics

Generated: 2026-08-28T20:03:15.504Z
Receipt: `ab685902c9602ed7fc147802` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 69.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 1.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 1.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 34 | blocking | 1.3s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 35 | blocking | 1.2s | 0 | `node scripts/build-news-desk.mjs --check` |
| 22 | blocking | 1.1s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 104 | advisory | 1.1s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 76 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 20 | blocking | 1.1s | 0 | `node scripts/check-schema-coverage.mjs` |
| 60 | blocking | 1.0s | 0 | `node scripts/build-leaderboard-subpages.mjs --check` |
| 19 | blocking | 1.0s | 0 | `node scripts/check-schema-coverage.mjs --self-test` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
