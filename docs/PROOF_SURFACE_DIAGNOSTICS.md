# Proof Surface Diagnostics

Generated: 2026-10-22T01:10:12.127Z
Receipt: `cefef4fc01f1e60627b7b9f6` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 111.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 92 | blocking | 6.2s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 35 | blocking | 4.0s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 38 | blocking | 3.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 3.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 78 | blocking | 3.2s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 22 | blocking | 2.8s | 0 | `node scripts/check-schema-coverage.mjs` |
| 101 | advisory | 2.7s | 0 | `node scripts/build-cta-state.mjs --check` |
| 37 | blocking | 2.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 96 | advisory | 2.3s | 0 | `node scripts/check-public-note-freshness.mjs` |
| 103 | advisory | 2.2s | 0 | `node scripts/build-atlas.mjs --check` |

## Failures

- None.
