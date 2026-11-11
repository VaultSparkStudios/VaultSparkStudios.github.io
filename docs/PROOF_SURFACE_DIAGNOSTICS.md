# Proof Surface Diagnostics

Generated: 2026-11-11T20:54:53.097Z
Receipt: `bea13e10a521995b6d6bbbfb` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 37.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 3.5s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 3.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 2.4s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 37 | blocking | 2.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 90 | blocking | 1.2s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 49 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 0.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 14 | blocking | 0.8s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 92 | blocking | 0.8s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 11 | blocking | 0.7s | 0 | `node scripts/check-og-images.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
