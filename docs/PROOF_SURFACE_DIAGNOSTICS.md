# Proof Surface Diagnostics

Generated: 2026-10-07T15:40:44.777Z
Receipt: `68ce3fc9d606fc15c00a28f3` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 55.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 106 | advisory | 3.5s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 65 | blocking | 2.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 1.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 11 | blocking | 1.9s | 0 | `node scripts/check-og-images.mjs` |
| 18 | blocking | 1.9s | 0 | `node scripts/check-videogame-schema.mjs` |
| 23 | blocking | 1.4s | 0 | `node scripts/check-game-playability-coherence.mjs --self-test` |
| 104 | advisory | 1.4s | 0 | `node scripts/check-registry-freshness.mjs` |
| 55 | blocking | 1.3s | 0 | `node scripts/build-vault-momentum.mjs --check` |
| 82 | blocking | 1.3s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 37 | blocking | 1.1s | 0 | `node scripts/build-news-desk.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
