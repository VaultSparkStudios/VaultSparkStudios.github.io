# Proof Surface Diagnostics

Generated: 2026-07-31T03:11:57.889Z
Receipt: `d4a6fc1a9e630a3aa4f5674c` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 14.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 79 | advisory | 0.6s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 16 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 9 | blocking | 0.4s | 0 | `node scripts/check-og-images.mjs` |
| 42 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 0.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 39 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 66 | blocking | 0.2s | 0 | `node scripts/check-phantom-carries.mjs` |
| 12 | blocking | 0.2s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 6 | blocking | 0.2s | 0 | `node scripts/check-proof-feed-generators.mjs --self-test` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
