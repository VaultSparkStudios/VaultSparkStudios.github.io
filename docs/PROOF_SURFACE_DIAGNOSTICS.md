# Proof Surface Diagnostics

Generated: 2026-09-17T07:14:23.379Z
Receipt: `f4043649f62ba8d00eced3ae` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 13.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 78 | blocking | 0.5s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 0.5s | 0 | `node scripts/build-news-desk.mjs --check` |
| 35 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 14 | blocking | 0.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 18 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 46 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 11 | blocking | 0.3s | 0 | `node scripts/check-og-images.mjs` |
| 88 | blocking | 0.3s | 1 | `node scripts/check-receipt-ordering.mjs` |
| 36 | blocking | 0.2s | 0 | `node scripts/build-news-desk.mjs --self-test` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
