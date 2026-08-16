# Proof Surface Diagnostics

Generated: 2026-08-16T04:47:53.868Z
Receipt: `75dd3c1e35541de7823d0039` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 25.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 45 | blocking | 1.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 17 | blocking | 0.5s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 42 | blocking | 0.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 22 | blocking | 0.5s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 16 | blocking | 0.5s | 0 | `node scripts/check-videogame-schema.mjs` |
| 19 | blocking | 0.5s | 0 | `node scripts/check-schema-coverage.mjs --self-test` |
| 14 | blocking | 0.5s | 0 | `node scripts/inject-collection-jsonld.mjs --check` |
| 18 | blocking | 0.5s | 0 | `node scripts/enrich-projects-schema.mjs --check` |
| 65 | blocking | 0.5s | 0 | `node scripts/check-worker-rewriter-safety.mjs` |
| 80 | advisory | 0.5s | 0 | `node scripts/check-registry-freshness.mjs` |

## Failures

- None.
