# Proof Surface Diagnostics

Generated: 2026-08-03T01:35:53.591Z
Receipt: `77f6db64bed0d1c1543d1dfd` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 19.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 0.5s | 0 | `node scripts/check-og-images.mjs` |
| 42 | blocking | 0.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 39 | blocking | 0.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 78 | advisory | 0.4s | 0 | `node scripts/check-nav-catalog-sync.mjs` |
| 19 | blocking | 0.4s | 0 | `node scripts/check-schema-coverage.mjs --self-test` |
| 46 | blocking | 0.4s | 0 | `node scripts/check-feed-publisher-manifest.mjs --check` |
| 16 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 79 | advisory | 0.4s | 0 | `node scripts/generate-build-sha.mjs --check` |

## Failures

- None.
