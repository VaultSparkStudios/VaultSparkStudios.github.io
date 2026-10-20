# Proof Surface Diagnostics

Generated: 2026-10-20T08:20:55.819Z
Receipt: `7cbf4dcd0f24fa9794e565b5` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 34.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 106 | advisory | 1.2s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 78 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 37 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 0.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 46 | blocking | 0.7s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 38 | blocking | 0.6s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 81 | blocking | 0.6s | 0 | `node scripts/build-route-consolidation.mjs --self-test` |
| 80 | blocking | 0.6s | 0 | `node scripts/build-projects-catalog.mjs --check` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-schema-coverage.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
