# Proof Surface Diagnostics

Generated: 2026-10-15T15:34:58.759Z
Receipt: `7d9011863b6e875adca9dfc4` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 21.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 1.6s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 11 | blocking | 1.4s | 0 | `node scripts/check-og-images.mjs` |
| 37 | blocking | 1.2s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 1.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 14 | blocking | 0.9s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 38 | blocking | 0.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 0.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 92 | blocking | 0.6s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 49 | blocking | 0.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 46 | blocking | 0.5s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
