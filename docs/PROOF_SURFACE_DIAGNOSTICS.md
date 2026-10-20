# Proof Surface Diagnostics

Generated: 2026-10-20T20:24:05.985Z
Receipt: `26121c6de21413b7ad97852c` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 85.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 6.3s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 3.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 2.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 11 | blocking | 2.2s | 0 | `node scripts/check-og-images.mjs` |
| 88 | blocking | 1.9s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 22 | blocking | 1.8s | 0 | `node scripts/check-schema-coverage.mjs` |
| 38 | blocking | 1.7s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 37 | blocking | 1.5s | 0 | `node scripts/build-news-desk.mjs --check` |
| 7 | blocking | 1.5s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |
| 40 | blocking | 1.3s | 0 | `node scripts/build-newsroom-run.mjs --check` |

## Failures

- None.
