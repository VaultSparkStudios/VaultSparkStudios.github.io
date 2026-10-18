# Proof Surface Diagnostics

Generated: 2026-10-18T19:00:20.634Z
Receipt: `db66583a400d77286066dcc1` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 55.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 6.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 37 | blocking | 2.2s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 1.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 46 | blocking | 1.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 92 | blocking | 1.4s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 65 | blocking | 1.3s | 0 | `node scripts/check-content-coherence.mjs` |
| 35 | blocking | 1.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 106 | advisory | 1.1s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 38 | blocking | 1.1s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 51 | blocking | 1.1s | 0 | `node scripts/check-trust-feed-freshness.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
