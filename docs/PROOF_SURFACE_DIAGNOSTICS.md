# Proof Surface Diagnostics

Generated: 2026-10-16T14:36:24.744Z
Receipt: `c5127d9d41c57d1bd3688c4d` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 47.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 3.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 2.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 2.3s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 22 | blocking | 1.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 65 | blocking | 1.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 35 | blocking | 1.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 49 | blocking | 1.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 11 | blocking | 1.2s | 0 | `node scripts/check-og-images.mjs` |
| 14 | blocking | 1.1s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 46 | blocking | 1.0s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- None.
