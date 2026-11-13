# Proof Surface Diagnostics

Generated: 2026-11-13T22:04:10.628Z
Receipt: `f2b1f5b06927bdabb2d7bf03` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 63.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 8.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 4.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 2.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 92 | blocking | 2.9s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 49 | blocking | 2.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 90 | blocking | 2.3s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 22 | blocking | 2.0s | 0 | `node scripts/check-schema-coverage.mjs` |
| 65 | blocking | 1.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 11 | blocking | 1.6s | 0 | `node scripts/check-og-images.mjs` |
| 35 | blocking | 1.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
