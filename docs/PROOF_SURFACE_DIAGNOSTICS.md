# Proof Surface Diagnostics

Generated: 2026-10-13T02:49:29.296Z
Receipt: `34bb49e11536ead71764ad6f` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 18.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 88 | blocking | 1.0s | 1 | `node scripts/check-receipt-ordering.mjs` |
| 37 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 35 | blocking | 0.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 78 | blocking | 0.7s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 38 | blocking | 0.6s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 0.6s | 0 | `node scripts/check-content-coherence.mjs` |
| 82 | blocking | 0.5s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 24 | blocking | 0.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
