# Proof Surface Diagnostics

Generated: 2026-10-22T23:50:48.075Z
Receipt: `8ed69f9f3637493c21512d8d` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 95.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 4.9s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 3.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 22 | blocking | 2.5s | 0 | `node scripts/check-schema-coverage.mjs` |
| 49 | blocking | 2.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 37 | blocking | 2.2s | 0 | `node scripts/build-news-desk.mjs --check` |
| 18 | blocking | 2.2s | 0 | `node scripts/check-videogame-schema.mjs` |
| 83 | blocking | 2.2s | 0 | `node scripts/check-cache-evidence-classification.mjs --self-test` |
| 35 | blocking | 2.0s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 15 | blocking | 1.8s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |
| 24 | blocking | 1.7s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
