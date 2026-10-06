# Proof Surface Diagnostics

Generated: 2026-10-06T23:20:56.893Z
Receipt: `7295eb9c104b6074ba5ae10c` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 32.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 1.0s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 37 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --check` |
| 24 | blocking | 0.9s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 65 | blocking | 0.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 22 | blocking | 0.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 38 | blocking | 0.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 35 | blocking | 0.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 82 | blocking | 0.7s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 18 | blocking | 0.7s | 0 | `node scripts/check-videogame-schema.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
