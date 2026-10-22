# Proof Surface Diagnostics

Generated: 2026-10-22T15:49:24.562Z
Receipt: `33ae5e37371fdf411ad471dd` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 131.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 22 | blocking | 4.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 11 | blocking | 4.3s | 0 | `node scripts/check-og-images.mjs` |
| 49 | blocking | 3.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 18 | blocking | 3.8s | 0 | `node scripts/check-videogame-schema.mjs` |
| 24 | blocking | 3.1s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 106 | advisory | 2.8s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 65 | blocking | 2.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 14 | blocking | 2.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 13 | blocking | 2.4s | 0 | `node scripts/build-og-coverage.mjs --check` |
| 12 | blocking | 2.2s | 0 | `node scripts/build-og-coverage.mjs --self-test` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
