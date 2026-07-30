# Proof Surface Diagnostics

Generated: 2026-07-30T02:18:09.655Z
Receipt: `93c7ca25ec4e2f4c5adbbb56` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 14.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 79 | advisory | 0.5s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 33 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 16 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 42 | blocking | 0.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 9 | blocking | 0.3s | 0 | `node scripts/check-og-images.mjs` |
| 46 | blocking | 0.3s | 0 | `node scripts/check-feed-publisher-manifest.mjs --check` |
| 44 | blocking | 0.2s | 0 | `node scripts/check-trust-feed-freshness.mjs` |
| 76 | advisory | 0.2s | 0 | `node scripts/build-atlas.mjs --check` |
| 12 | blocking | 0.2s | 0 | `node scripts/build-og-cards.mjs --self-test` |

## Failures

- None.
