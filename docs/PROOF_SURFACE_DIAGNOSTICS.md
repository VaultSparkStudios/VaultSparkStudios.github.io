# Proof Surface Diagnostics

Generated: 2026-11-12T04:24:55.767Z
Receipt: `899f3db506d4714e1fab1188` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 22.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 2.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 1.5s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 1.2s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.0s | 0 | `node scripts/check-content-coherence.mjs` |
| 90 | blocking | 0.9s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 92 | blocking | 0.8s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 88 | blocking | 0.8s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-schema-coverage.mjs` |
| 46 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
