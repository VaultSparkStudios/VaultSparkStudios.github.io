# Proof Surface Diagnostics

Generated: 2026-07-28T03:00:05.055Z
Receipt: `a9bb4ace6a15ae99c5f97a50` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 11.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 0.4s | 0 | `node scripts/check-og-images.mjs` |
| 22 | blocking | 0.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 42 | blocking | 0.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 16 | blocking | 0.2s | 0 | `node scripts/check-videogame-schema.mjs` |
| 79 | advisory | 0.2s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 12 | blocking | 0.2s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 8 | blocking | 0.2s | 0 | `node scripts/check-og-images.mjs --self-test` |
| 7 | blocking | 0.2s | 0 | `node scripts/check-proof-feed-generators.mjs` |
| 2 | blocking | 0.2s | 0 | `node scripts/build-public-status.mjs --check` |

## Failures

- None.
