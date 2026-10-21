# Proof Surface Diagnostics

Generated: 2026-10-21T20:52:07.252Z
Receipt: `d87bd10898068be8faabe2be` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 44.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 88 | blocking | 1.5s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 106 | advisory | 1.2s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 78 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 1.1s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 0.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 22 | blocking | 0.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 50 | blocking | 0.8s | 0 | `node scripts/check-trust-feed-freshness.mjs --self-test` |
| 38 | blocking | 0.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 35 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
