# Proof Surface Diagnostics

Generated: 2026-10-19T19:42:35.280Z
Receipt: `16bc8a2a196524ed11228dd1` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 53.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 22 | blocking | 1.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 65 | blocking | 1.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 78 | blocking | 1.9s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 1.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 35 | blocking | 1.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 82 | blocking | 1.7s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 24 | blocking | 1.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 18 | blocking | 1.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 38 | blocking | 1.4s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 1.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
