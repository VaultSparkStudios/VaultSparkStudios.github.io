# Proof Surface Diagnostics

Generated: 2026-11-20T06:00:18.225Z
Receipt: `241f59b0055e4b589a466e15` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 42.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 2.5s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 2.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 2.0s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 88 | blocking | 1.9s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 49 | blocking | 1.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.3s | 0 | `node scripts/check-content-coherence.mjs` |
| 90 | blocking | 1.3s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 92 | blocking | 1.1s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 35 | blocking | 1.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 36 | blocking | 1.0s | 0 | `node scripts/build-news-desk.mjs --self-test` |

## Failures

- None.
