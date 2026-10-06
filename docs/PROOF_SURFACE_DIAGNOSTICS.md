# Proof Surface Diagnostics

Generated: 2026-10-06T08:23:02.529Z
Receipt: `bdaa0bed126ea3b6b5d46940` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 26.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.0s | 0 | `node scripts/check-content-coherence.mjs` |
| 24 | blocking | 1.0s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 106 | advisory | 0.7s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-schema-coverage.mjs` |
| 35 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 82 | blocking | 0.6s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 37 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 0.5s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 62 | blocking | 0.5s | 0 | `node scripts/build-leaderboard-subpages.mjs --check` |

## Failures

- None.
