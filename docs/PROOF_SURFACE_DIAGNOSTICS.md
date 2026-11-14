# Proof Surface Diagnostics

Generated: 2026-11-14T02:12:31.205Z
Receipt: `1e09ee253010592baebc1e7f` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 29.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 2.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 2.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 1.5s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 1.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 90 | blocking | 1.1s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 92 | blocking | 1.0s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 65 | blocking | 1.0s | 0 | `node scripts/check-content-coherence.mjs` |
| 22 | blocking | 0.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 46 | blocking | 0.8s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 88 | blocking | 0.7s | 0 | `node scripts/check-receipt-ordering.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
