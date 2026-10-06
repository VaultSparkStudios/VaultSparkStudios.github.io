# Proof Surface Diagnostics

Generated: 2026-10-06T12:59:37.808Z
Receipt: `2b20283cbcf4954ec354d8ab` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 25.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 106 | advisory | 1.2s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 49 | blocking | 1.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 38 | blocking | 0.7s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 0.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 35 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-schema-coverage.mjs` |
| 82 | blocking | 0.6s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 37 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 18 | blocking | 0.6s | 0 | `node scripts/check-videogame-schema.mjs` |
| 78 | blocking | 0.5s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
