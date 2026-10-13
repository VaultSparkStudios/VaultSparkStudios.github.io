# Proof Surface Diagnostics

Generated: 2026-10-13T21:37:32.314Z
Receipt: `871f613ad9a9f0d52fcab880` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 32.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 2.1s | 0 | `node scripts/build-news-desk.mjs --check` |
| 88 | blocking | 1.6s | 1 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 1.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 1.3s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 1.3s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 1.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 1.1s | 0 | `node scripts/check-schema-coverage.mjs` |
| 18 | blocking | 0.9s | 0 | `node scripts/check-videogame-schema.mjs` |
| 24 | blocking | 0.8s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 35 | blocking | 0.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
