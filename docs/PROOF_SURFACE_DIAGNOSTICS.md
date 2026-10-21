# Proof Surface Diagnostics

Generated: 2026-10-21T19:12:00.288Z
Receipt: `46ff607ce6de0a0274fab3b4` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 46.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 1.4s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 106 | advisory | 1.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 49 | blocking | 1.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 37 | blocking | 1.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 1 | blocking | 0.9s | 0 | `node scripts/build-ecosystem-stats-page.mjs --check` |
| 22 | blocking | 0.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 67 | blocking | 0.9s | 0 | `node scripts/build-oracle-answers.mjs --check` |
| 18 | blocking | 0.9s | 0 | `node scripts/check-videogame-schema.mjs` |
| 78 | blocking | 0.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
