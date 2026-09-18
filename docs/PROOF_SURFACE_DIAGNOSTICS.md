# Proof Surface Diagnostics

Generated: 2026-09-18T22:27:15.060Z
Receipt: `9fc8128a197d3ad46d6a07e7` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 20.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 0.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 78 | blocking | 0.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 35 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 46 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 37 | blocking | 0.5s | 0 | `node scripts/build-news-desk.mjs --check` |
| 92 | blocking | 0.5s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 14 | blocking | 0.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 11 | blocking | 0.4s | 0 | `node scripts/check-og-images.mjs` |
| 38 | blocking | 0.4s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 18 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |

## Failures

- Step 96 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
