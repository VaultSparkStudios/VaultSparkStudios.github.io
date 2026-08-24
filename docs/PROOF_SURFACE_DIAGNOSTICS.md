# Proof Surface Diagnostics

Generated: 2026-08-24T10:08:23.292Z
Receipt: `2a2ca598002d978f777a6f82` · coverage 89/89

Latest: **88/89** passed · blocking 72/72 · advisory findings 1/17 · total 42.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 1.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 1.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 35 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --check` |
| 22 | blocking | 0.9s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 20 | blocking | 0.8s | 0 | `node scripts/check-schema-coverage.mjs` |
| 21 | blocking | 0.7s | 0 | `node scripts/check-game-playability-coherence.mjs --self-test` |
| 83 | advisory | 0.7s | 0 | `node scripts/build-atlas.mjs --check` |
| 27 | blocking | 0.7s | 0 | `node scripts/build-forge-project-pages.mjs --self-test` |
| 38 | blocking | 0.7s | 0 | `node scripts/build-newsroom-run.mjs --check` |
| 15 | blocking | 0.7s | 0 | `node scripts/check-videogame-schema.mjs --self-test` |

## Failures

- Step 89 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
