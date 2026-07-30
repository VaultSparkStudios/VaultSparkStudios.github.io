# Proof Surface Diagnostics

Generated: 2026-07-30T20:08:48.062Z
Receipt: `f76aef2e523e8cb73df00fb9` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 12.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 16 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 33 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 42 | blocking | 0.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 9 | blocking | 0.3s | 0 | `node scripts/check-og-images.mjs` |
| 79 | advisory | 0.2s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 12 | blocking | 0.2s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 20 | blocking | 0.2s | 0 | `node scripts/check-schema-coverage.mjs` |
| 39 | blocking | 0.2s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 22 | blocking | 0.2s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 63 | blocking | 0.2s | 0 | `node scripts/check-project-status-coherence.mjs --self-test` |

## Failures

- None.
