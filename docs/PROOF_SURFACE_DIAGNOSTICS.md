# Proof Surface Diagnostics

Generated: 2026-08-23T19:11:42.664Z
Receipt: `b67d9bf6474e2ace724a5ac8` · coverage 89/89

Latest: **87/89** passed · blocking 72/72 · advisory findings 2/17 · total 90.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 38 | blocking | 2.8s | 0 | `node scripts/build-newsroom-run.mjs --check` |
| 36 | blocking | 2.1s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 2.1s | 0 | `node scripts/build-oracle-answers.mjs --check` |
| 47 | blocking | 2.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 70 | blocking | 2.0s | 0 | `node scripts/check-phantom-carries.mjs --self-test` |
| 22 | blocking | 2.0s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 20 | blocking | 1.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 37 | blocking | 1.9s | 0 | `node scripts/build-newsroom-run.mjs --self-test` |
| 18 | blocking | 1.9s | 0 | `node scripts/enrich-projects-schema.mjs --check` |
| 85 | advisory | 1.7s | 0 | `node scripts/check-nav-catalog-sync.mjs` |

## Failures

- Step 86 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 89 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
