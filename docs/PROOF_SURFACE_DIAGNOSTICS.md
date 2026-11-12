# Proof Surface Diagnostics

Generated: 2026-11-12T02:24:04.994Z
Receipt: `6fa40454a7d442be0823bf9b` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 43.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 3.2s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 2.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 2.5s | 0 | `node scripts/build-news-desk.mjs --check` |
| 92 | blocking | 2.1s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 38 | blocking | 1.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 90 | blocking | 1.7s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 49 | blocking | 1.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 46 | blocking | 1.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 35 | blocking | 1.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 65 | blocking | 1.3s | 0 | `node scripts/check-content-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
