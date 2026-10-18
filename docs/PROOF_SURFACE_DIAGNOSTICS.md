# Proof Surface Diagnostics

Generated: 2026-10-18T15:28:17.193Z
Receipt: `4431b66391057238540920e0` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 200.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 65 | blocking | 14.3s | 0 | `node scripts/check-content-coherence.mjs` |
| 92 | blocking | 14.0s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 22 | blocking | 11.3s | 0 | `node scripts/check-schema-coverage.mjs` |
| 38 | blocking | 11.3s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 78 | blocking | 9.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 9.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 6.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 46 | blocking | 6.7s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 37 | blocking | 6.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 11 | blocking | 6.7s | 0 | `node scripts/check-og-images.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
