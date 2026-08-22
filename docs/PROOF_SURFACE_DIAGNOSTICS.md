# Proof Surface Diagnostics

Generated: 2026-08-22T04:29:58.613Z
Receipt: `097602898b56bc5f0fcc1dec` · coverage 87/87

Latest: **86/87** passed · blocking 70/70 · advisory findings 1/17 · total 37.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 1.2s | 0 | `node scripts/check-og-images.mjs` |
| 12 | blocking | 1.1s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 45 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 0.8s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 16 | blocking | 0.8s | 0 | `node scripts/check-videogame-schema.mjs` |
| 71 | advisory | 0.8s | 0 | `node scripts/check-mission-statement-coherence.mjs` |
| 66 | blocking | 0.8s | 0 | `node scripts/check-project-status-coherence.mjs --self-test` |
| 33 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 21 | blocking | 0.7s | 0 | `node scripts/check-game-playability-coherence.mjs --self-test` |
| 13 | blocking | 0.7s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |

## Failures

- Step 87 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
