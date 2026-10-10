# Proof Surface Diagnostics

Generated: 2026-10-10T16:00:37.282Z
Receipt: `a8328c5851363cf53ab56f76` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 25.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 46 | blocking | 3.9s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 14 | blocking | 1.6s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 88 | blocking | 1.1s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 37 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 0.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 0.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 0.6s | 0 | `node scripts/check-content-coherence.mjs` |
| 106 | advisory | 0.6s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 38 | blocking | 0.6s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 102 | advisory | 0.4s | 0 | `node scripts/build-hero-portfolio.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
