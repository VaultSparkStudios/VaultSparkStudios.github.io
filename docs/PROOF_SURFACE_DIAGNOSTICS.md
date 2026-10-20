# Proof Surface Diagnostics

Generated: 2026-10-20T16:42:03.176Z
Receipt: `3a28332d05d6e94b1743b30e` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 80.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 5.2s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 22 | blocking | 4.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 65 | blocking | 4.3s | 0 | `node scripts/check-content-coherence.mjs` |
| 88 | blocking | 4.1s | 1 | `node scripts/check-receipt-ordering.mjs` |
| 37 | blocking | 3.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 3.2s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 35 | blocking | 2.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 49 | blocking | 1.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 46 | blocking | 1.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 40 | blocking | 1.5s | 0 | `node scripts/build-newsroom-run.mjs --check` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
