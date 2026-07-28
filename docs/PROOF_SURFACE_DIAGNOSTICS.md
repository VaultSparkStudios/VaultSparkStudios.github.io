# Proof Surface Diagnostics

Generated: 2026-07-28T00:55:45.958Z
Receipt: `17c377f990c68f51b015f727` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 11.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 0.3s | 0 | `node scripts/check-og-images.mjs` |
| 42 | blocking | 0.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 7 | blocking | 0.3s | 0 | `node scripts/check-proof-feed-generators.mjs` |
| 4 | blocking | 0.3s | 0 | `node scripts/build-security-posture.mjs --check` |
| 16 | blocking | 0.2s | 0 | `node scripts/check-videogame-schema.mjs` |
| 22 | blocking | 0.2s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 79 | advisory | 0.2s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 12 | blocking | 0.2s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 39 | blocking | 0.2s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- None.
