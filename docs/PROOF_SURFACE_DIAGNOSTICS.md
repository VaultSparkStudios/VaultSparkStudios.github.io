# Proof Surface Diagnostics

Generated: 2026-09-12T02:04:34.778Z
Receipt: `8e319c186dff315ed4519795` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 23.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 14 | blocking | 1.2s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 49 | blocking | 0.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 0.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 46 | blocking | 0.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 35 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 24 | blocking | 0.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 78 | blocking | 0.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 18 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 37 | blocking | 0.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 82 | blocking | 0.3s | 0 | `node scripts/build-route-consolidation.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
