# Proof Surface Diagnostics

Generated: 2026-10-16T15:18:30.132Z
Receipt: `bed5d7adeec8e425cded5bf1` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 41.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 2.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 65 | blocking | 2.0s | 0 | `node scripts/check-content-coherence.mjs` |
| 37 | blocking | 1.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 49 | blocking | 1.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 1.3s | 0 | `node scripts/check-schema-coverage.mjs` |
| 38 | blocking | 1.2s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 92 | blocking | 1.2s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 35 | blocking | 1.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 11 | blocking | 1.0s | 0 | `node scripts/check-og-images.mjs` |
| 106 | advisory | 0.9s | 0 | `node scripts/generate-build-sha.mjs --check` |

## Failures

- None.
