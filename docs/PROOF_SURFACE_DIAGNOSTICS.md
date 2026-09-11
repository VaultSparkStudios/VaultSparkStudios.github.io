# Proof Surface Diagnostics

Generated: 2026-09-11T20:57:20.803Z
Receipt: `c4e77890b948f8499b3396fa` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 29.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 35 | blocking | 0.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 92 | blocking | 0.6s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 37 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 106 | advisory | 0.6s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 36 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 78 | blocking | 0.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 64 | blocking | 0.6s | 0 | `node scripts/check-content-coherence.mjs --self-test` |
| 49 | blocking | 0.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 14 | blocking | 0.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 82 | blocking | 0.4s | 0 | `node scripts/build-route-consolidation.mjs --check` |

## Failures

- None.
