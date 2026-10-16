# Proof Surface Diagnostics

Generated: 2026-10-16T04:54:23.822Z
Receipt: `f21ed912bcf6a9fd766388c6` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 36.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 2.4s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 1.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 88 | blocking | 1.5s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 38 | blocking | 1.5s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 1.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 92 | blocking | 0.9s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 65 | blocking | 0.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 46 | blocking | 0.7s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 106 | advisory | 0.7s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 36 | blocking | 0.7s | 0 | `node scripts/build-news-desk.mjs --self-test` |

## Failures

- None.
