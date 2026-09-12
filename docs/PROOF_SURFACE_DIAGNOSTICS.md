# Proof Surface Diagnostics

Generated: 2026-09-12T02:51:05.896Z
Receipt: `199339b3afdff4f10f9bae36` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 20.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 0.5s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 37 | blocking | 0.4s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 0.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 14 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 35 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 46 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 18 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |
| 82 | blocking | 0.3s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 24 | blocking | 0.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
