# Proof Surface Diagnostics

Generated: 2026-10-06T17:58:28.375Z
Receipt: `f19fdc2929e677b59f47c1d7` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 39.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 2.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 1.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 18 | blocking | 1.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 38 | blocking | 1.2s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 22 | blocking | 1.2s | 0 | `node scripts/check-schema-coverage.mjs` |
| 65 | blocking | 1.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 82 | blocking | 1.0s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 37 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 24 | blocking | 0.8s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 35 | blocking | 0.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
