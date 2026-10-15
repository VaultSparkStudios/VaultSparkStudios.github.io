# Proof Surface Diagnostics

Generated: 2026-10-15T01:46:44.357Z
Receipt: `9071435563a4caeecd9f5940` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 14.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 1.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 0.9s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 0.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 0.6s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 0.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 92 | blocking | 0.5s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 46 | blocking | 0.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 11 | blocking | 0.4s | 0 | `node scripts/check-og-images.mjs` |

## Failures

- None.
