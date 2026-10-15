# Proof Surface Diagnostics

Generated: 2026-10-15T17:23:47.399Z
Receipt: `1b44940df0a51e4371acc767` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 25.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 1.9s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 1.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 1.2s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 1.0s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 0.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 92 | blocking | 0.5s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 106 | advisory | 0.5s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 87 | blocking | 0.4s | 0 | `node scripts/check-receipt-ordering.mjs --self-test` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
