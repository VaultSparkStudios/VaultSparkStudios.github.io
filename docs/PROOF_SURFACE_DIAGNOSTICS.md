# Proof Surface Diagnostics

Generated: 2026-09-18T01:05:39.527Z
Receipt: `3632d2b91296e581b71ae702` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 14.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 0.5s | 0 | `node scripts/build-news-desk.mjs --check` |
| 49 | blocking | 0.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 78 | blocking | 0.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 46 | blocking | 0.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 14 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 88 | blocking | 0.3s | 1 | `node scripts/check-receipt-ordering.mjs` |
| 18 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |
| 11 | blocking | 0.3s | 0 | `node scripts/check-og-images.mjs` |
| 82 | blocking | 0.3s | 0 | `node scripts/build-route-consolidation.mjs --check` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
