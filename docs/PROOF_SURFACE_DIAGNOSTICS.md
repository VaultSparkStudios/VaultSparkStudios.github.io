# Proof Surface Diagnostics

Generated: 2026-08-17T17:03:33.402Z
Receipt: `ff3f494ce674db580d8f492f` · coverage 84/84

Latest: **83/84** passed · blocking 69/69 · advisory findings 1/15 · total 33.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 82 | advisory | 1.3s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 12 | blocking | 1.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 75 | advisory | 1.2s | 0 | `node scripts/build-constellation-activity.mjs --check` |
| 45 | blocking | 1.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 53 | blocking | 0.8s | 0 | `node scripts/check-journal-dates.mjs` |
| 77 | advisory | 0.8s | 0 | `node scripts/build-cta-state.mjs --check` |
| 69 | blocking | 0.8s | 0 | `node scripts/check-phantom-carries.mjs` |
| 35 | blocking | 0.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 83 | advisory | 0.7s | 0 | `node scripts/check-lighthouse-trend.mjs` |
| 21 | blocking | 0.6s | 0 | `node scripts/check-game-playability-coherence.mjs --self-test` |

## Failures

- Step 82 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
