# Proof Surface Diagnostics

Generated: 2026-11-03T06:59:54.823Z
Receipt: `e076d5a9690bae02d680fd27` · coverage 90/109

Latest: **89/90** passed · blocking 89/90 · advisory findings 0/0 · total 18.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 1.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 1.1s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 1.0s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 0.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 0.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 11 | blocking | 0.8s | 0 | `node scripts/check-og-images.mjs` |
| 46 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 22 | blocking | 0.5s | 0 | `node scripts/check-schema-coverage.mjs` |
| 88 | blocking | 0.5s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 35 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 90 [blocking]: `node scripts/check-visual-qa-retention.mjs --check` exited 1 — self/contract
