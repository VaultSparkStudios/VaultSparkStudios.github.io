# Proof Surface Diagnostics

Generated: 2026-10-06T23:10:35.669Z
Receipt: `515b6b6687ec82de75fc31af` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 26.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 37 | blocking | 1.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 0.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 18 | blocking | 0.8s | 0 | `node scripts/check-videogame-schema.mjs` |
| 22 | blocking | 0.8s | 0 | `node scripts/check-schema-coverage.mjs` |
| 78 | blocking | 0.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 82 | blocking | 0.7s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 35 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 38 | blocking | 0.7s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 24 | blocking | 0.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
