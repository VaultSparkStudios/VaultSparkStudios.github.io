# Proof Surface Diagnostics

Generated: 2026-09-07T05:51:02.391Z
Receipt: `d2da1e5db6c3027cc8be1094` · coverage 107/107

Latest: **105/107** passed · blocking 90/90 · advisory findings 2/17 · total 43.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 1.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 104 | advisory | 0.9s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 80 | blocking | 0.8s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 16 | blocking | 0.7s | 0 | `node scripts/check-videogame-schema.mjs` |
| 33 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 35 | blocking | 0.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 12 | blocking | 0.7s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 86 | blocking | 0.6s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 44 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
