# Proof Surface Diagnostics

Generated: 2026-10-30T23:10:03.875Z
Receipt: `dbcac9748f4dc6b131c8712d` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 37.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 65 | blocking | 2.0s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 1.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 78 | blocking | 1.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 35 | blocking | 1.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 37 | blocking | 1.2s | 0 | `node scripts/build-news-desk.mjs --check` |
| 18 | blocking | 1.1s | 0 | `node scripts/check-videogame-schema.mjs` |
| 106 | advisory | 1.1s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 22 | blocking | 1.0s | 0 | `node scripts/check-schema-coverage.mjs` |
| 38 | blocking | 1.0s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 82 | blocking | 0.8s | 0 | `node scripts/build-route-consolidation.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
