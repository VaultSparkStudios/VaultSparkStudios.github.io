# Proof Surface Diagnostics

Generated: 2026-11-03T02:42:01.847Z
Receipt: `a9e522126bd55aed00122e93` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 21.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 3.6s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 37 | blocking | 1.4s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 1.2s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 1.1s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 90 | blocking | 0.9s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 49 | blocking | 0.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 0.5s | 0 | `node scripts/check-content-coherence.mjs` |
| 92 | blocking | 0.5s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 89 | blocking | 0.5s | 0 | `node scripts/check-visual-qa-retention.mjs --self-test` |
| 46 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
