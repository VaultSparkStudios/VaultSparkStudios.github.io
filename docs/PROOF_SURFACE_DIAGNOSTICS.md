# Proof Surface Diagnostics

Generated: 2026-11-13T23:14:03.280Z
Receipt: `184bf574528e65f01cfb9b0b` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 69.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 4.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 4.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 92 | blocking | 4.2s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 38 | blocking | 4.1s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 90 | blocking | 3.4s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 49 | blocking | 2.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 88 | blocking | 2.5s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 46 | blocking | 2.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 35 | blocking | 2.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 65 | blocking | 1.9s | 0 | `node scripts/check-content-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
