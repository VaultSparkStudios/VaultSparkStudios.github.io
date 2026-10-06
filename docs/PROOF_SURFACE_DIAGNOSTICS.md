# Proof Surface Diagnostics

Generated: 2026-10-06T17:49:14.389Z
Receipt: `6ffc75f1e21ee269511d65af` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 40.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 106 | advisory | 2.3s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 82 | blocking | 1.5s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 49 | blocking | 1.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 78 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 87 | blocking | 0.9s | 0 | `node scripts/check-receipt-ordering.mjs --self-test` |
| 57 | blocking | 0.9s | 0 | `node scripts/check-journal-dates.mjs` |
| 24 | blocking | 0.9s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 35 | blocking | 0.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 0.8s | 0 | `node scripts/check-schema-coverage.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
