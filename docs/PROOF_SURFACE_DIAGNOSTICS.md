# Proof Surface Diagnostics

Generated: 2026-10-23T20:02:39.747Z
Receipt: `d493c8e98ee0742092388436` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 59.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 2.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 2.2s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 38 | blocking | 1.5s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 106 | advisory | 1.5s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 82 | blocking | 1.4s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 65 | blocking | 1.3s | 0 | `node scripts/check-content-coherence.mjs` |
| 78 | blocking | 1.3s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 1.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 18 | blocking | 1.1s | 0 | `node scripts/check-videogame-schema.mjs` |
| 24 | blocking | 1.1s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
