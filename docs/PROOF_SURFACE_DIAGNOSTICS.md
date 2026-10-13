# Proof Surface Diagnostics

Generated: 2026-10-13T22:07:26.579Z
Receipt: `18474dfdc428fcc7ffbab9e4` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 45.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 12 | blocking | 1.8s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 78 | blocking | 1.7s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 14 | blocking | 1.5s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 49 | blocking | 1.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 11 | blocking | 1.3s | 0 | `node scripts/check-og-images.mjs` |
| 1 | blocking | 1.2s | 0 | `node scripts/build-ecosystem-stats-page.mjs --check` |
| 18 | blocking | 1.2s | 0 | `node scripts/check-videogame-schema.mjs` |
| 88 | blocking | 1.1s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 22 | blocking | 1.1s | 0 | `node scripts/check-schema-coverage.mjs` |
| 65 | blocking | 1.0s | 0 | `node scripts/check-content-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
