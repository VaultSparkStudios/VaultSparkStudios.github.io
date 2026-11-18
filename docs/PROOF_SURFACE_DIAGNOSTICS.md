# Proof Surface Diagnostics

Generated: 2026-11-18T07:49:59.711Z
Receipt: `960946e3ca0a87f0a823d21d` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 53.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 90 | blocking | 3.4s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 38 | blocking | 2.3s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 78 | blocking | 2.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 2.1s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 1.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 1.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 82 | blocking | 1.3s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 106 | advisory | 1.0s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 18 | blocking | 1.0s | 0 | `node scripts/check-videogame-schema.mjs` |
| 22 | blocking | 1.0s | 0 | `node scripts/check-schema-coverage.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
