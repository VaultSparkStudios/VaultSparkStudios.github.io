# Proof Surface Diagnostics

Generated: 2026-11-18T07:45:09.978Z
Receipt: `1fe59b5496a2ec7f97b5fdd3` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 42.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 3.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 90 | blocking | 2.5s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 38 | blocking | 1.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 78 | blocking | 1.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 46 | blocking | 1.2s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 65 | blocking | 1.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 1.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 1.0s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 88 | blocking | 0.7s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 92 | blocking | 0.7s | 0 | `node scripts/generate-sitemap.mjs --check` |

## Failures

- None.
