# Proof Surface Diagnostics

Generated: 2026-08-13T20:01:16.099Z
Receipt: `cbe3c6d9bda0be7352d198e8` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 10.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 0.3s | 0 | `node scripts/check-og-images.mjs` |
| 33 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 0.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 42 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 12 | blocking | 0.2s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 16 | blocking | 0.2s | 0 | `node scripts/check-videogame-schema.mjs` |
| 11 | blocking | 0.2s | 0 | `node scripts/build-og-coverage.mjs --check` |
| 45 | blocking | 0.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 82 | advisory | 0.2s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 13 | blocking | 0.2s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |

## Failures

- None.
