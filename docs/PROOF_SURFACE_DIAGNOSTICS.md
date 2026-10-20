# Proof Surface Diagnostics

Generated: 2026-10-20T20:55:12.739Z
Receipt: `f23cea3dc55fd4afabf32568` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 103.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 14 | blocking | 3.8s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 49 | blocking | 3.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 3.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 37 | blocking | 3.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 35 | blocking | 2.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 106 | advisory | 1.9s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 78 | blocking | 1.9s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 1.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 7 | blocking | 1.8s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |
| 50 | blocking | 1.8s | 0 | `node scripts/check-trust-feed-freshness.mjs --self-test` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
