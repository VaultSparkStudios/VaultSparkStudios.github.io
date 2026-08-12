# Proof Surface Diagnostics

Generated: 2026-08-12T08:11:01.942Z
Receipt: `e2014a41359d490accfed383` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 101.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 7.1s | 0 | `node scripts/check-og-images.mjs` |
| 22 | blocking | 4.8s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 14 | blocking | 4.0s | 0 | `node scripts/inject-collection-jsonld.mjs --check` |
| 15 | blocking | 2.9s | 0 | `node scripts/check-videogame-schema.mjs --self-test` |
| 12 | blocking | 2.8s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 82 | advisory | 2.3s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 54 | blocking | 2.3s | 0 | `node scripts/check-decision-currency.mjs --self-test` |
| 13 | blocking | 2.1s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |
| 67 | blocking | 1.8s | 0 | `node scripts/check-project-status-coherence.mjs` |
| 21 | blocking | 1.8s | 0 | `node scripts/check-game-playability-coherence.mjs --self-test` |

## Failures

- None.
