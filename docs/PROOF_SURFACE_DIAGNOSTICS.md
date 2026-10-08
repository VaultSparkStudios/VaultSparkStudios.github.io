# Proof Surface Diagnostics

Generated: 2026-10-08T14:37:09.647Z
Receipt: `81461be24d2c2c9860ee35aa` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 92.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 106 | advisory | 6.2s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 22 | blocking | 3.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 11 | blocking | 3.3s | 0 | `node scripts/check-og-images.mjs` |
| 18 | blocking | 3.2s | 0 | `node scripts/check-videogame-schema.mjs` |
| 49 | blocking | 3.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 43 | blocking | 3.0s | 0 | `node scripts/build-velocity-series.mjs --self-test` |
| 37 | blocking | 2.1s | 0 | `node scripts/build-news-desk.mjs --check` |
| 82 | blocking | 2.0s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 12 | blocking | 2.0s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 14 | blocking | 2.0s | 0 | `node scripts/build-og-cards.mjs --self-test` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
