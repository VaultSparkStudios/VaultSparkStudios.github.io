# Proof Surface Diagnostics

Generated: 2026-10-06T22:10:36.796Z
Receipt: `4074c3a71ec200a35f1bac92` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 32.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 106 | advisory | 1.5s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 49 | blocking | 1.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 24 | blocking | 1.0s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 82 | blocking | 0.9s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 65 | blocking | 0.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 46 | blocking | 0.8s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 22 | blocking | 0.8s | 0 | `node scripts/check-schema-coverage.mjs` |
| 18 | blocking | 0.7s | 0 | `node scripts/check-videogame-schema.mjs` |
| 37 | blocking | 0.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 92 | blocking | 0.7s | 0 | `node scripts/generate-sitemap.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
