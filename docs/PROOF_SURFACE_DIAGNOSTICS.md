# Proof Surface Diagnostics

Generated: 2026-10-13T23:29:03.203Z
Receipt: `4f925debb1f6fa753d8c4a0e` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 39.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.4s | 0 | `node scripts/check-content-coherence.mjs` |
| 106 | advisory | 1.3s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 88 | blocking | 1.3s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 37 | blocking | 1.1s | 0 | `node scripts/build-news-desk.mjs --check` |
| 82 | blocking | 1.1s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 11 | blocking | 1.0s | 0 | `node scripts/check-og-images.mjs` |
| 78 | blocking | 1.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 0.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 24 | blocking | 0.8s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
