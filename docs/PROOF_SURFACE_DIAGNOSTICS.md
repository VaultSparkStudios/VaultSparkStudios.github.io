# Proof Surface Diagnostics

Generated: 2026-10-06T09:01:24.351Z
Receipt: `777fe077099c1ca6a655c7fd` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 22.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 0.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 65 | blocking | 0.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 11 | blocking | 0.7s | 0 | `node scripts/check-og-images.mjs` |
| 18 | blocking | 0.7s | 0 | `node scripts/check-videogame-schema.mjs` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-schema-coverage.mjs` |
| 37 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 82 | blocking | 0.6s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 78 | blocking | 0.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 24 | blocking | 0.5s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
