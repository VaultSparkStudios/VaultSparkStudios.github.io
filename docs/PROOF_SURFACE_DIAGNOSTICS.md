# Proof Surface Diagnostics

Generated: 2026-08-11T22:51:34.870Z
Receipt: `c768d2bf80008dba66d4765f` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 103.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 4.7s | 0 | `node scripts/check-og-images.mjs` |
| 82 | advisory | 3.3s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 33 | blocking | 2.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 84 | advisory | 2.4s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs` |
| 81 | advisory | 2.4s | 0 | `node scripts/check-nav-catalog-sync.mjs` |
| 12 | blocking | 2.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 67 | blocking | 2.2s | 0 | `node scripts/check-project-status-coherence.mjs` |
| 59 | blocking | 2.0s | 0 | `node scripts/check-sitemap-coverage.mjs` |
| 83 | advisory | 1.9s | 0 | `node scripts/check-lighthouse-trend.mjs` |
| 61 | blocking | 1.9s | 0 | `node scripts/check-content-coherence.mjs` |

## Failures

- None.
