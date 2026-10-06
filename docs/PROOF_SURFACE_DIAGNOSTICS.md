# Proof Surface Diagnostics

Generated: 2026-10-06T17:55:25.763Z
Receipt: `5bfc730783aa5bf3e948a225` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 42.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 106 | advisory | 3.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 82 | blocking | 2.7s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 65 | blocking | 1.4s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 1.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 1.1s | 0 | `node scripts/check-schema-coverage.mjs` |
| 23 | blocking | 1.0s | 0 | `node scripts/check-game-playability-coherence.mjs --self-test` |
| 35 | blocking | 1.0s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 78 | blocking | 0.9s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 24 | blocking | 0.8s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 18 | blocking | 0.8s | 0 | `node scripts/check-videogame-schema.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
