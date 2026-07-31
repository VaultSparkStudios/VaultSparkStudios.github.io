# Proof Surface Diagnostics

Generated: 2026-07-31T03:04:38.798Z
Receipt: `078d09bdb5c2b51fa83f2453` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 14.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 79 | advisory | 0.5s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 33 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 42 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 9 | blocking | 0.3s | 0 | `node scripts/check-og-images.mjs` |
| 22 | blocking | 0.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 16 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |
| 7 | blocking | 0.3s | 0 | `node scripts/check-proof-feed-generators.mjs` |
| 64 | blocking | 0.3s | 0 | `node scripts/check-project-status-coherence.mjs` |
| 24 | blocking | 0.3s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |
| 39 | blocking | 0.2s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
