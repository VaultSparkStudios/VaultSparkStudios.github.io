# Proof Surface Diagnostics

Generated: 2026-10-06T17:05:37.563Z
Receipt: `1470cdf02770b10826375d3d` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 29.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 1.2s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 65 | blocking | 1.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 22 | blocking | 1.0s | 0 | `node scripts/check-schema-coverage.mjs` |
| 35 | blocking | 0.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 37 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 82 | blocking | 0.7s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 18 | blocking | 0.6s | 0 | `node scripts/check-videogame-schema.mjs` |
| 24 | blocking | 0.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 36 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --self-test` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
