# Proof Surface Diagnostics

Generated: 2026-07-31T01:33:34.617Z
Receipt: `997bf4541c3b2b7e378743e2` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 13.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 0.3s | 0 | `node scripts/check-og-images.mjs` |
| 42 | blocking | 0.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 0.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 16 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |
| 79 | advisory | 0.3s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 39 | blocking | 0.2s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 12 | blocking | 0.2s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 20 | blocking | 0.2s | 0 | `node scripts/check-schema-coverage.mjs` |
| 48 | blocking | 0.2s | 0 | `node scripts/build-vault-momentum.mjs --check` |

## Failures

- None.
