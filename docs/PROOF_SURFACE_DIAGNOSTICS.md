# Proof Surface Diagnostics

Generated: 2026-09-14T08:19:45.740Z
Receipt: `c12e4dc4f70ca6493e48e897` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 35.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 0.9s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 24 | blocking | 0.7s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 35 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 87 | blocking | 0.6s | 0 | `node scripts/check-receipt-ordering.mjs --self-test` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-schema-coverage.mjs` |
| 92 | blocking | 0.6s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 46 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 49 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 0.6s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 88 | blocking | 0.5s | 0 | `node scripts/check-receipt-ordering.mjs` |

## Failures

- None.
