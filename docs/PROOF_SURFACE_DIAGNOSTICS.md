# Proof Surface Diagnostics

Generated: 2026-11-11T19:58:22.213Z
Receipt: `84e966840882a2346812ab26` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 78.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 7.6s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 6.2s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 5.4s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 4.0s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 90 | blocking | 4.0s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 49 | blocking | 2.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 2.4s | 0 | `node scripts/check-content-coherence.mjs` |
| 92 | blocking | 1.6s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 46 | blocking | 1.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 36 | blocking | 1.1s | 0 | `node scripts/build-news-desk.mjs --self-test` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
