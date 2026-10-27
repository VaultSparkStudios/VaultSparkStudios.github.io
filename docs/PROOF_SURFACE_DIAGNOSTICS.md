# Proof Surface Diagnostics

Generated: 2026-10-27T01:04:49.967Z
Receipt: `137196249e9a8b93960a6f42` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 67.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 4.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 3.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 22 | blocking | 2.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 18 | blocking | 2.3s | 0 | `node scripts/check-videogame-schema.mjs` |
| 78 | blocking | 2.2s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 65 | blocking | 2.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 82 | blocking | 1.7s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 62 | blocking | 1.6s | 0 | `node scripts/build-leaderboard-subpages.mjs --check` |
| 88 | blocking | 1.4s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 35 | blocking | 1.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
