# Proof Surface Diagnostics

Generated: 2026-10-19T21:41:09.629Z
Receipt: `6f113fed503a674380ddc8b9` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 29.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 1.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 49 | blocking | 0.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 0.9s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 38 | blocking | 0.7s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 0.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-schema-coverage.mjs` |
| 92 | blocking | 0.6s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 35 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 46 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- None.
