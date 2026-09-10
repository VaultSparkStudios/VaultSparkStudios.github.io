# Proof Surface Diagnostics

Generated: 2026-09-10T07:51:06.217Z
Receipt: `dca0bc77a3e149ffd055221d` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 17.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 68 | blocking | 0.4s | 0 | `node scripts/check-worker-rewriter-safety.mjs --self-test` |
| 106 | advisory | 0.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 14 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 35 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 31 | blocking | 0.3s | 0 | `node scripts/build-portfolio-counts.mjs --self-test` |
| 37 | blocking | 0.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 82 | blocking | 0.3s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 18 | blocking | 0.2s | 0 | `node scripts/check-videogame-schema.mjs` |
| 24 | blocking | 0.2s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
