# Proof Surface Diagnostics

Generated: 2026-11-16T05:33:47.351Z
Receipt: `b932dab79e5d3780c2e07b8f` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 21.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 1.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 1.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 1.0s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 90 | blocking | 0.9s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 49 | blocking | 0.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 0.6s | 0 | `node scripts/check-content-coherence.mjs` |
| 88 | blocking | 0.4s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 46 | blocking | 0.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 92 | blocking | 0.4s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-schema-coverage.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
