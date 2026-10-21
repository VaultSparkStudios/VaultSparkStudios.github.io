# Proof Surface Diagnostics

Generated: 2026-10-21T02:23:38.644Z
Receipt: `29f05e5aa1561e25a951bffb` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 43.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 14 | blocking | 1.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 49 | blocking | 1.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 37 | blocking | 1.4s | 0 | `node scripts/build-news-desk.mjs --check` |
| 88 | blocking | 1.2s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 65 | blocking | 1.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 18 | blocking | 1.1s | 0 | `node scripts/check-videogame-schema.mjs` |
| 78 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 0.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 106 | advisory | 0.8s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 22 | blocking | 0.7s | 0 | `node scripts/check-schema-coverage.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
