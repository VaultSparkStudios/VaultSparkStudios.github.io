# Proof Surface Diagnostics

Generated: 2026-07-31T20:19:59.371Z
Receipt: `667efc6ce14dc63270eb5f95` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 30.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 79 | advisory | 1.1s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 9 | blocking | 0.8s | 0 | `node scripts/check-og-images.mjs` |
| 10 | blocking | 0.6s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 72 | advisory | 0.6s | 0 | `node scripts/build-constellation-activity.mjs --check` |
| 78 | advisory | 0.6s | 0 | `node scripts/check-nav-catalog-sync.mjs` |
| 11 | blocking | 0.6s | 0 | `node scripts/build-og-coverage.mjs --check` |
| 53 | blocking | 0.5s | 0 | `node scripts/build-proposed-edges.mjs --self-test` |
| 24 | blocking | 0.5s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |
| 80 | advisory | 0.5s | 0 | `node scripts/check-lighthouse-trend.mjs` |
| 81 | advisory | 0.5s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
