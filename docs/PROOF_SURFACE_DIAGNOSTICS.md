# Proof Surface Diagnostics

Generated: 2026-09-03T14:27:59.676Z
Receipt: `1d1a32886c954684e2a609df` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 37.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 104 | advisory | 1.3s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 33 | blocking | 1.0s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 47 | blocking | 0.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 36 | blocking | 0.7s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 16 | blocking | 0.7s | 0 | `node scripts/check-videogame-schema.mjs` |
| 34 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 35 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 86 | blocking | 0.6s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 80 | blocking | 0.6s | 0 | `node scripts/build-route-consolidation.mjs --check` |

## Failures

- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
