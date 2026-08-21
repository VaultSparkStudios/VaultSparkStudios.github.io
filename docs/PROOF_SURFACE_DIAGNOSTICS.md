# Proof Surface Diagnostics

Generated: 2026-08-21T18:02:32.074Z
Receipt: `b7398b86b5682c759d07740b` · coverage 87/87

Latest: **86/87** passed · blocking 70/70 · advisory findings 1/17 · total 63.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 45 | blocking | 2.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 42 | blocking | 2.2s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 33 | blocking | 1.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 9 | blocking | 1.7s | 0 | `node scripts/check-og-images.mjs` |
| 16 | blocking | 1.5s | 0 | `node scripts/check-videogame-schema.mjs` |
| 13 | blocking | 1.4s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |
| 84 | advisory | 1.2s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 28 | blocking | 1.1s | 0 | `node scripts/build-forge-project-pages.mjs --check` |
| 22 | blocking | 1.1s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 39 | blocking | 1.0s | 0 | `node scripts/build-velocity-series.mjs --self-test` |

## Failures

- Step 87 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
