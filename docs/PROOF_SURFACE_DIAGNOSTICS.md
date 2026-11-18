# Proof Surface Diagnostics

Generated: 2026-11-18T08:38:59.802Z
Receipt: `07ebac421491c270c8b1f854` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 66.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 90 | blocking | 3.8s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 1 | blocking | 3.2s | 0 | `node scripts/build-ecosystem-stats-page.mjs --check` |
| 37 | blocking | 2.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 2.4s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 78 | blocking | 2.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 24 | blocking | 2.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 82 | blocking | 2.0s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 11 | blocking | 1.6s | 0 | `node scripts/check-og-images.mjs` |
| 49 | blocking | 1.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.3s | 0 | `node scripts/check-content-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
