# Proof Surface Diagnostics

Generated: 2026-11-18T09:08:03.110Z
Receipt: `9b2fae01bc20bd90d6d4be5a` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 35.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 1.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 90 | blocking | 1.5s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 38 | blocking | 1.5s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 78 | blocking | 1.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.0s | 0 | `node scripts/check-content-coherence.mjs` |
| 46 | blocking | 0.7s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 88 | blocking | 0.7s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 22 | blocking | 0.7s | 0 | `node scripts/check-schema-coverage.mjs` |
| 92 | blocking | 0.6s | 0 | `node scripts/generate-sitemap.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
