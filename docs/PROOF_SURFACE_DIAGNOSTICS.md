# Proof Surface Diagnostics

Generated: 2026-10-12T06:03:15.565Z
Receipt: `a3ee2928eb3ebbaa93386518` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 16.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 0.7s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 37 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 0.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 65 | blocking | 0.6s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 38 | blocking | 0.5s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 18 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 106 | advisory | 0.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 46 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
