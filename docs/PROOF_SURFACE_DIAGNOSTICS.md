# Proof Surface Diagnostics

Generated: 2026-07-30T01:59:15.121Z
Receipt: `c8721f71ae9af3178e7c4ca0` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 19.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 0.5s | 0 | `node scripts/check-og-images.mjs` |
| 22 | blocking | 0.5s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 24 | blocking | 0.4s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |
| 23 | blocking | 0.4s | 0 | `node scripts/check-hero-spotlight-coherence.mjs --self-test` |
| 2 | blocking | 0.4s | 0 | `node scripts/build-public-status.mjs --check` |
| 79 | advisory | 0.3s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 16 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |
| 33 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 67 | advisory | 0.3s | 0 | `node scripts/check-mission-statement-coherence.mjs` |
| 42 | blocking | 0.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |

## Failures

- None.
