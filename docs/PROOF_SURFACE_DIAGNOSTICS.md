# Proof Surface Diagnostics

Generated: 2026-07-31T07:17:10.736Z
Receipt: `0d02fc3f2eb3a762e63ea487` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 26.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 17 | blocking | 1.2s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 33 | blocking | 0.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 20 | blocking | 0.8s | 0 | `node scripts/check-schema-coverage.mjs` |
| 19 | blocking | 0.7s | 0 | `node scripts/check-schema-coverage.mjs --self-test` |
| 18 | blocking | 0.7s | 0 | `node scripts/enrich-projects-schema.mjs --check` |
| 73 | advisory | 0.7s | 0 | `node scripts/build-oracle-feedback-themes.mjs --check` |
| 28 | blocking | 0.6s | 0 | `node scripts/build-forge-project-pages.mjs --check` |
| 12 | blocking | 0.6s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 23 | blocking | 0.6s | 0 | `node scripts/check-hero-spotlight-coherence.mjs --self-test` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- None.
