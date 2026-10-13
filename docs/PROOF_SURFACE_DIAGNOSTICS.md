# Proof Surface Diagnostics

Generated: 2026-10-13T02:06:56.984Z
Receipt: `15cf02caab11383bb6444fa0` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 29.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 88 | blocking | 1.1s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 37 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 0.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 0.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 78 | blocking | 0.7s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 82 | blocking | 0.7s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 35 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 106 | advisory | 0.5s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 46 | blocking | 0.5s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- None.
