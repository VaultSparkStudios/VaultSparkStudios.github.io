# Proof Surface Diagnostics

Generated: 2026-11-15T04:22:42.657Z
Receipt: `272ca225ad887f63737b95e9` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 34.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 2.2s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 2.2s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 1.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 1.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.4s | 0 | `node scripts/check-content-coherence.mjs` |
| 90 | blocking | 1.4s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 92 | blocking | 1.3s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 88 | blocking | 1.1s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 46 | blocking | 0.9s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 35 | blocking | 0.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
