# Proof Surface Diagnostics

Generated: 2026-08-23T17:19:54.202Z
Receipt: `396ff9e90e541ad92932402d` · coverage 89/89

Latest: **88/89** passed · blocking 72/72 · advisory findings 1/17 · total 107.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 20.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 18 | blocking | 3.5s | 0 | `node scripts/enrich-projects-schema.mjs --check` |
| 12 | blocking | 3.2s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 16 | blocking | 2.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 86 | advisory | 2.3s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 24 | blocking | 2.3s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |
| 22 | blocking | 2.2s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 27 | blocking | 2.0s | 0 | `node scripts/build-forge-project-pages.mjs --self-test` |
| 17 | blocking | 1.9s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 29 | blocking | 1.9s | 0 | `node scripts/build-portfolio-counts.mjs --self-test` |

## Failures

- Step 89 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
