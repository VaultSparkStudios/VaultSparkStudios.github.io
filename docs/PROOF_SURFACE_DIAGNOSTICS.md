# Proof Surface Diagnostics

Generated: 2026-07-31T02:34:24.815Z
Receipt: `7770a953d79f283786a91c68` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 15.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 22 | blocking | 0.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 9 | blocking | 0.4s | 0 | `node scripts/check-og-images.mjs` |
| 17 | blocking | 0.4s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 42 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 79 | advisory | 0.4s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 16 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |
| 33 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 14 | blocking | 0.3s | 0 | `node scripts/inject-collection-jsonld.mjs --check` |
| 24 | blocking | 0.3s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |
| 12 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |

## Failures

- None.
