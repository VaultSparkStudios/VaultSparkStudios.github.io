# Proof Surface Diagnostics

Generated: 2026-10-15T15:18:29.140Z
Receipt: `ad6a7caada2cd72e0870c232` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 18.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 1.4s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 1.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 1.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 0.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 38 | blocking | 0.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 46 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 49 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 92 | blocking | 0.5s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 35 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-schema-coverage.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
