# Proof Surface Diagnostics

Generated: 2026-10-02T22:01:18.753Z
Receipt: `2d1906e204d7d6541e44830a` · coverage 67/109

Latest: **66/67** passed · blocking 66/67 · advisory findings 0/0 · total 61.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 13.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 3.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 2.5s | 0 | `node scripts/check-schema-coverage.mjs` |
| 20 | blocking | 2.4s | 0 | `node scripts/enrich-projects-schema.mjs --check` |
| 37 | blocking | 2.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 18 | blocking | 2.0s | 0 | `node scripts/check-videogame-schema.mjs` |
| 38 | blocking | 2.0s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 1.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 39 | blocking | 1.8s | 0 | `node scripts/build-newsroom-run.mjs --self-test` |
| 24 | blocking | 1.8s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 67 [blocking]: `node scripts/build-oracle-answers.mjs --check` exited 1 — self/contract
