# Proof Surface Diagnostics

Generated: 2026-08-20T05:35:40.947Z
Receipt: `744bbdd62b731f2769873da5` · coverage 87/87

Latest: **86/87** passed · blocking 70/70 · advisory findings 1/17 · total 32.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 45 | blocking | 0.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 5 | blocking | 0.7s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |
| 33 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 62 | blocking | 0.6s | 0 | `node scripts/build-oracle-answers.mjs --self-test` |
| 16 | blocking | 0.6s | 0 | `node scripts/check-videogame-schema.mjs` |
| 42 | blocking | 0.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 10 | blocking | 0.5s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 17 | blocking | 0.5s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 84 | advisory | 0.5s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 79 | advisory | 0.5s | 0 | `node scripts/build-cta-state.mjs --check` |

## Failures

- Step 87 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
