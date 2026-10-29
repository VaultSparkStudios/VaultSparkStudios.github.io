# Proof Surface Diagnostics

Generated: 2026-10-29T21:03:53.415Z
Receipt: `06747d9420a8a9d33ff65251` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 64.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 6.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 46 | blocking | 4.7s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 106 | advisory | 3.1s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 90 | blocking | 2.5s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 82 | blocking | 2.2s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 37 | blocking | 2.1s | 0 | `node scripts/build-news-desk.mjs --check` |
| 14 | blocking | 2.1s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 65 | blocking | 1.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 78 | blocking | 1.5s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 1.3s | 0 | `node scripts/generate-news-pages.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
