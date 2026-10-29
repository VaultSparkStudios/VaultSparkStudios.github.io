# Proof Surface Diagnostics

Generated: 2026-10-29T20:23:50.630Z
Receipt: `2575d2caf6220865ba603744` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 52.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 3.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 24 | blocking | 1.8s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 106 | advisory | 1.7s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 22 | blocking | 1.7s | 0 | `node scripts/check-schema-coverage.mjs` |
| 18 | blocking | 1.6s | 0 | `node scripts/check-videogame-schema.mjs` |
| 37 | blocking | 1.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 35 | blocking | 1.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 65 | blocking | 1.4s | 0 | `node scripts/check-content-coherence.mjs` |
| 28 | blocking | 1.2s | 0 | `node scripts/check-project-links.mjs` |
| 82 | blocking | 1.2s | 0 | `node scripts/build-route-consolidation.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
