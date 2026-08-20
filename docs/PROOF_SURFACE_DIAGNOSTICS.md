# Proof Surface Diagnostics

Generated: 2026-08-20T05:14:55.616Z
Receipt: `79ff5e4253b6ede4a056a18a` · coverage 87/87

Latest: **86/87** passed · blocking 70/70 · advisory findings 1/17 · total 38.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 45 | blocking | 1.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 42 | blocking | 0.9s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 38 | blocking | 0.8s | 0 | `node scripts/check-intelligence-hydration.mjs` |
| 40 | blocking | 0.8s | 0 | `node scripts/build-velocity-series.mjs --check` |
| 65 | blocking | 0.8s | 0 | `node scripts/check-worker-rewriter-safety.mjs` |
| 70 | blocking | 0.8s | 0 | `node scripts/verify-provider-chain.mjs --self-test` |
| 16 | blocking | 0.7s | 0 | `node scripts/check-videogame-schema.mjs` |
| 81 | advisory | 0.7s | 0 | `node scripts/build-atlas.mjs --check` |
| 33 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 78 | advisory | 0.7s | 0 | `node scripts/build-oracle-feedback-themes.mjs --check` |

## Failures

- Step 87 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
