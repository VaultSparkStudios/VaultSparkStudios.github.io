# Proof Surface Diagnostics

Generated: 2026-08-03T03:39:53.528Z
Receipt: `008ab920ed585d02a203dbc8` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 4.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 12 | blocking | 0.2s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 9 | blocking | 0.1s | 0 | `node scripts/check-og-images.mjs` |
| 22 | blocking | 0.1s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 33 | blocking | 0.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 39 | blocking | 0.1s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 16 | blocking | 0.1s | 0 | `node scripts/check-videogame-schema.mjs` |
| 42 | blocking | 0.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 54 | blocking | 0.1s | 0 | `node scripts/build-proposed-edges.mjs --check` |
| 64 | blocking | 0.1s | 0 | `node scripts/check-project-status-coherence.mjs` |
| 79 | advisory | 0.1s | 1 | `node scripts/generate-build-sha.mjs --check` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
