# Proof Surface Diagnostics

Generated: 2026-11-17T06:02:27.111Z
Receipt: `f811316185a1783aca42a9ed` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 52.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 3.8s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 37 | blocking | 3.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 3.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 3.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 38 | blocking | 2.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 90 | blocking | 2.3s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 92 | blocking | 2.2s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 35 | blocking | 1.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 11 | blocking | 1.4s | 0 | `node scripts/check-og-images.mjs` |
| 65 | blocking | 1.4s | 0 | `node scripts/check-content-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
