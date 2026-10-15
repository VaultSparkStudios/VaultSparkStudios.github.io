# Proof Surface Diagnostics

Generated: 2026-10-15T14:28:55.337Z
Receipt: `f85e86dd0a7d84653b995df6` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 19.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 1.7s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 92 | blocking | 1.2s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 37 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 0.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 0.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 0.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 0.5s | 0 | `node scripts/check-schema-coverage.mjs` |
| 46 | blocking | 0.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 106 | advisory | 0.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 88 | blocking | 0.4s | 0 | `node scripts/check-receipt-ordering.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
