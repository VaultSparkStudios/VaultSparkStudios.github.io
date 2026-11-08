# Proof Surface Diagnostics

Generated: 2026-11-08T17:00:54.914Z
Receipt: `c7de002b539b054b024880b2` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 30.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 1.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 1.1s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 90 | blocking | 0.9s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 49 | blocking | 0.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 0.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 106 | advisory | 0.7s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-schema-coverage.mjs` |
| 35 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 92 | blocking | 0.5s | 0 | `node scripts/generate-sitemap.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
