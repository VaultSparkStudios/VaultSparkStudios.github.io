# Proof Surface Diagnostics

Generated: 2026-08-08T00:16:32.312Z
Receipt: `e7ffa8f974523c667e59df63` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 36.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 12 | blocking | 1.8s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 45 | blocking | 1.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 82 | advisory | 1.5s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 22 | blocking | 1.0s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 24 | blocking | 1.0s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |
| 81 | advisory | 0.8s | 0 | `node scripts/check-nav-catalog-sync.mjs` |
| 9 | blocking | 0.8s | 0 | `node scripts/check-og-images.mjs` |
| 20 | blocking | 0.8s | 0 | `node scripts/check-schema-coverage.mjs` |
| 16 | blocking | 0.7s | 0 | `node scripts/check-videogame-schema.mjs` |
| 19 | blocking | 0.7s | 0 | `node scripts/check-schema-coverage.mjs --self-test` |

## Failures

- None.
