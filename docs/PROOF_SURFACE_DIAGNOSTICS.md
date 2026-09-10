# Proof Surface Diagnostics

Generated: 2026-09-10T17:15:01.364Z
Receipt: `dc60d895304122a28326ae4e` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 15.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 0.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 18 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 14 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 78 | blocking | 0.3s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 35 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 46 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 24 | blocking | 0.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 37 | blocking | 0.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 82 | blocking | 0.3s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 38 | blocking | 0.3s | 0 | `node scripts/generate-news-pages.mjs --check` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
