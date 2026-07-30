# Proof Surface Diagnostics

Generated: 2026-07-30T02:06:59.476Z
Receipt: `31d748dca458baa05e13d513` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 14.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 79 | advisory | 0.8s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 9 | blocking | 0.5s | 0 | `node scripts/check-og-images.mjs` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 12 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 42 | blocking | 0.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 16 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |
| 33 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 13 | blocking | 0.3s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |
| 62 | blocking | 0.2s | 0 | `node scripts/check-worker-rewriter-safety.mjs` |
| 11 | blocking | 0.2s | 0 | `node scripts/build-og-coverage.mjs --check` |

## Failures

- None.
