# Proof Surface Diagnostics

Generated: 2026-08-20T04:47:49.436Z
Receipt: `f2751beb7cac6cebc3c8c411` · coverage 87/87

Latest: **86/87** passed · blocking 70/70 · advisory findings 1/17 · total 34.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 45 | blocking | 1.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 18 | blocking | 0.7s | 0 | `node scripts/enrich-projects-schema.mjs --check` |
| 48 | blocking | 0.7s | 0 | `node scripts/check-feed-publisher-manifest.mjs --self-test` |
| 41 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --self-test` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 50 | blocking | 0.6s | 0 | `node scripts/build-vault-momentum.mjs --self-test` |
| 42 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 39 | blocking | 0.6s | 0 | `node scripts/build-velocity-series.mjs --self-test` |
| 28 | blocking | 0.6s | 0 | `node scripts/build-forge-project-pages.mjs --check` |

## Failures

- Step 87 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
