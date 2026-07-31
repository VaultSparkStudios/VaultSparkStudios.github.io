# Proof Surface Diagnostics

Generated: 2026-07-31T03:19:17.274Z
Receipt: `d2e2baa7470efe66b5ee1984` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 15.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 79 | advisory | 0.7s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 33 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 9 | blocking | 0.4s | 0 | `node scripts/check-og-images.mjs` |
| 39 | blocking | 0.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 42 | blocking | 0.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 54 | blocking | 0.3s | 0 | `node scripts/build-proposed-edges.mjs --check` |
| 22 | blocking | 0.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 16 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |
| 24 | blocking | 0.3s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |
| 12 | blocking | 0.2s | 0 | `node scripts/build-og-cards.mjs --self-test` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
