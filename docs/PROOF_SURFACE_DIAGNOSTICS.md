# Proof Surface Diagnostics

Generated: 2026-10-21T18:37:10.546Z
Receipt: `cf604b4b60f91494e627713e` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 57.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 2.1s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 106 | advisory | 1.5s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 24 | blocking | 1.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 49 | blocking | 1.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 78 | blocking | 1.2s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 22 | blocking | 1.2s | 0 | `node scripts/check-schema-coverage.mjs` |
| 38 | blocking | 1.1s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 36 | blocking | 1.1s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 18 | blocking | 1.1s | 0 | `node scripts/check-videogame-schema.mjs` |
| 37 | blocking | 1.1s | 0 | `node scripts/build-news-desk.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
