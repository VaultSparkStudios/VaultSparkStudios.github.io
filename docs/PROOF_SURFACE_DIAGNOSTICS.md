# Proof Surface Diagnostics

Generated: 2026-08-19T18:36:00.780Z
Receipt: `5ae35ee1d00bf11267473c1f` · coverage 86/86

Latest: **86/86** passed · blocking 70/70 · advisory findings 0/16 · total 35.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 18 | blocking | 1.1s | 0 | `node scripts/enrich-projects-schema.mjs --check` |
| 45 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 64 | blocking | 0.8s | 0 | `node scripts/check-worker-rewriter-safety.mjs --self-test` |
| 5 | blocking | 0.8s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |
| 84 | advisory | 0.8s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 20 | blocking | 0.7s | 0 | `node scripts/check-schema-coverage.mjs` |
| 9 | blocking | 0.7s | 0 | `node scripts/check-og-images.mjs` |
| 33 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 17 | blocking | 0.6s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 70 | blocking | 0.6s | 0 | `node scripts/verify-provider-chain.mjs --self-test` |

## Failures

- None.
