# Proof Surface Diagnostics

Generated: 2026-10-06T21:53:57.270Z
Receipt: `b7cf941c85151bef367c8c55` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 42.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 2.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 18 | blocking | 2.5s | 0 | `node scripts/check-videogame-schema.mjs` |
| 35 | blocking | 1.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 106 | advisory | 1.5s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 22 | blocking | 1.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 82 | blocking | 1.4s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 24 | blocking | 1.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 65 | blocking | 1.3s | 0 | `node scripts/check-content-coherence.mjs` |
| 48 | blocking | 1.1s | 0 | `node scripts/derive-game-index.mjs --check` |
| 78 | blocking | 1.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
