# Proof Surface Diagnostics

Generated: 2026-11-18T09:05:24.416Z
Receipt: `50c37b8054468b3306643a44` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 41.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 2.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 1.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 90 | blocking | 1.8s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 78 | blocking | 1.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 1.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 46 | blocking | 0.8s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 22 | blocking | 0.8s | 0 | `node scripts/check-schema-coverage.mjs` |
| 35 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 88 | blocking | 0.6s | 0 | `node scripts/check-receipt-ordering.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
