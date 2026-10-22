# Proof Surface Diagnostics

Generated: 2026-10-22T20:59:44.967Z
Receipt: `7e951f899b7439add012815f` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 48.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 1.5s | 0 | `node scripts/build-news-desk.mjs --check` |
| 88 | blocking | 1.4s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 49 | blocking | 1.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.3s | 0 | `node scripts/check-content-coherence.mjs` |
| 38 | blocking | 1.1s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 101 | advisory | 1.1s | 0 | `node scripts/build-cta-state.mjs --check` |
| 78 | blocking | 1.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 22 | blocking | 0.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 35 | blocking | 0.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 106 | advisory | 0.9s | 0 | `node scripts/generate-build-sha.mjs --check` |

## Failures

- None.
