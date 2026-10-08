# Proof Surface Diagnostics

Generated: 2026-10-08T17:05:13.853Z
Receipt: `935a2e3631bfe45c5aeea290` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 102.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 18 | blocking | 7.2s | 0 | `node scripts/check-videogame-schema.mjs` |
| 82 | blocking | 5.8s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 49 | blocking | 4.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 2.9s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 22 | blocking | 2.8s | 0 | `node scripts/check-schema-coverage.mjs` |
| 65 | blocking | 2.6s | 0 | `node scripts/check-content-coherence.mjs` |
| 35 | blocking | 2.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 11 | blocking | 2.3s | 0 | `node scripts/check-og-images.mjs` |
| 54 | blocking | 2.2s | 0 | `node scripts/build-vault-momentum.mjs --self-test` |
| 24 | blocking | 1.9s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
