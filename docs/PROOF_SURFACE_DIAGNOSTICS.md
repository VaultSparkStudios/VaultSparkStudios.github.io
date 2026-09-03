# Proof Surface Diagnostics

Generated: 2026-09-03T21:49:15.972Z
Receipt: `72c5f327b0cdfb92716651e4` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 47.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 12 | blocking | 1.5s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 47 | blocking | 1.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 79 | blocking | 1.2s | 0 | `node scripts/build-route-consolidation.mjs --self-test` |
| 80 | blocking | 1.0s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 33 | blocking | 1.0s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 104 | advisory | 0.9s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 44 | blocking | 0.8s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 90 | blocking | 0.8s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 36 | blocking | 0.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 9 | blocking | 0.8s | 0 | `node scripts/check-og-images.mjs` |

## Failures

- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
