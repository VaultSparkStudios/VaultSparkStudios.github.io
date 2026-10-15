# Proof Surface Diagnostics

Generated: 2026-10-15T17:32:55.887Z
Receipt: `a48237901f0afd427fccef98` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 31.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 1.9s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 1.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 1.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 1.2s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 0.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 0.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 92 | blocking | 0.7s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 46 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 106 | advisory | 0.6s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 11 | blocking | 0.5s | 0 | `node scripts/check-og-images.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
