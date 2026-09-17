# Proof Surface Diagnostics

Generated: 2026-09-17T08:17:20.582Z
Receipt: `17e49c3423040ed7b5441588` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 24.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 1.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 35 | blocking | 1.0s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 46 | blocking | 1.0s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 49 | blocking | 0.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 37 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 0.6s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 24 | blocking | 0.5s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 14 | blocking | 0.5s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 11 | blocking | 0.4s | 0 | `node scripts/check-og-images.mjs` |
| 36 | blocking | 0.4s | 0 | `node scripts/build-news-desk.mjs --self-test` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
