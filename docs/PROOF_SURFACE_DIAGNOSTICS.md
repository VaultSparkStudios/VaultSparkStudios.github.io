# Proof Surface Diagnostics

Generated: 2026-10-12T05:51:55.724Z
Receipt: `907100707ecf02b9c28e73c9` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 18.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 88 | blocking | 0.7s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 37 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 0.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 65 | blocking | 0.5s | 0 | `node scripts/check-content-coherence.mjs` |
| 38 | blocking | 0.5s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 35 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 24 | blocking | 0.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 106 | advisory | 0.4s | 1 | `node scripts/generate-build-sha.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
