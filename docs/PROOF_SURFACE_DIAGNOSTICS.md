# Proof Surface Diagnostics

Generated: 2026-10-16T17:55:21.587Z
Receipt: `7546282702ea519a28736854` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 20.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 0.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 0.6s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 0.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 0.5s | 0 | `node scripts/check-content-coherence.mjs` |
| 22 | blocking | 0.5s | 0 | `node scripts/check-schema-coverage.mjs` |
| 82 | blocking | 0.4s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 92 | blocking | 0.4s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 73 | blocking | 0.4s | 0 | `node scripts/check-phantom-carries.mjs` |
| 35 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- None.
