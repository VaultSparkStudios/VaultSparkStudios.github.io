# Proof Surface Diagnostics

Generated: 2026-10-06T09:11:00.288Z
Receipt: `111efc36389125d90d1f74dc` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 27.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 1.5s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 24 | blocking | 1.0s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 82 | blocking | 0.9s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 35 | blocking | 0.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 65 | blocking | 0.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 18 | blocking | 0.7s | 0 | `node scripts/check-videogame-schema.mjs` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-schema-coverage.mjs` |
| 37 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 26 | blocking | 0.5s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
