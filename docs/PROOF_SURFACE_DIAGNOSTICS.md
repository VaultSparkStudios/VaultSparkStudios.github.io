# Proof Surface Diagnostics

Generated: 2026-10-23T19:01:14.977Z
Receipt: `2ab371c0fec46b434cd53d54` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 57.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 18 | blocking | 3.0s | 0 | `node scripts/check-videogame-schema.mjs` |
| 11 | blocking | 1.7s | 0 | `node scripts/check-og-images.mjs` |
| 49 | blocking | 1.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 1.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 35 | blocking | 1.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 37 | blocking | 1.1s | 0 | `node scripts/build-news-desk.mjs --check` |
| 82 | blocking | 1.0s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 106 | advisory | 1.0s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 65 | blocking | 1.0s | 0 | `node scripts/check-content-coherence.mjs` |
| 78 | blocking | 0.9s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
