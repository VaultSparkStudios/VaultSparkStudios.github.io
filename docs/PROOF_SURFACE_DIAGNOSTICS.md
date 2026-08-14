# Proof Surface Diagnostics

Generated: 2026-08-14T09:28:45.867Z
Receipt: `73c9c3fae98d6afc6fa3927b` · coverage 84/84

Latest: **83/84** passed · blocking 69/69 · advisory findings 1/15 · total 38.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 33 | blocking | 1.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 42 | blocking | 1.2s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 9 | blocking | 1.0s | 0 | `node scripts/check-og-images.mjs` |
| 45 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 0.8s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 13 | blocking | 0.8s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |
| 82 | advisory | 0.8s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 16 | blocking | 0.7s | 0 | `node scripts/check-videogame-schema.mjs` |
| 12 | blocking | 0.7s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 73 | advisory | 0.7s | 0 | `node scripts/check-identity-coherence.mjs` |

## Failures

- Step 82 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
