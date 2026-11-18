# Proof Surface Diagnostics

Generated: 2026-11-18T07:24:24.824Z
Receipt: `77b3ddecc40fbd72b03583ac` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 143.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 17.5s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 65 | blocking | 8.4s | 0 | `node scripts/check-content-coherence.mjs` |
| 88 | blocking | 7.9s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 37 | blocking | 6.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 90 | blocking | 6.6s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 92 | blocking | 4.9s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 38 | blocking | 4.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 3.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 46 | blocking | 3.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 35 | blocking | 3.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- None.
