# Proof Surface Diagnostics

Generated: 2026-10-06T17:01:53.197Z
Receipt: `74ab3143a273e56ec6314e9c` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 28.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 0.9s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 18 | blocking | 0.9s | 0 | `node scripts/check-videogame-schema.mjs` |
| 38 | blocking | 0.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 0.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 37 | blocking | 0.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 22 | blocking | 0.7s | 0 | `node scripts/check-schema-coverage.mjs` |
| 82 | blocking | 0.6s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 11 | blocking | 0.6s | 0 | `node scripts/check-og-images.mjs` |
| 78 | blocking | 0.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
