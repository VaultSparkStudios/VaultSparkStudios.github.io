# Proof Surface Diagnostics

Generated: 2026-10-25T23:34:32.519Z
Receipt: `1d824ded9350097759da059d` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 57.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 1.4s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 49 | blocking | 1.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 1.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 1.2s | 0 | `node scripts/check-schema-coverage.mjs` |
| 106 | advisory | 1.2s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 78 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 1.1s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 1.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 24 | blocking | 1.1s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 82 | blocking | 1.1s | 0 | `node scripts/build-route-consolidation.mjs --check` |

## Failures

- None.
