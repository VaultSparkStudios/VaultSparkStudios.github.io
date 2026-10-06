# Proof Surface Diagnostics

Generated: 2026-10-06T23:38:09.635Z
Receipt: `e80982ce0f9fd4a15871c851` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 38.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 2.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 82 | blocking | 1.5s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 65 | blocking | 1.4s | 0 | `node scripts/check-content-coherence.mjs` |
| 24 | blocking | 1.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 106 | advisory | 1.3s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 35 | blocking | 1.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 0.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 36 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 18 | blocking | 0.8s | 0 | `node scripts/check-videogame-schema.mjs` |
| 37 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
