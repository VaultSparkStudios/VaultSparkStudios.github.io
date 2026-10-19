# Proof Surface Diagnostics

Generated: 2026-10-19T20:40:46.450Z
Receipt: `7fe29ad5aec51a513d6e3282` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 47.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 2.1s | 0 | `node scripts/build-news-desk.mjs --check` |
| 106 | advisory | 1.5s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 78 | blocking | 1.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 1.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.2s | 0 | `node scripts/check-content-coherence.mjs` |
| 35 | blocking | 1.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 82 | blocking | 1.1s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 38 | blocking | 1.0s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 22 | blocking | 1.0s | 0 | `node scripts/check-schema-coverage.mjs` |
| 46 | blocking | 1.0s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- None.
