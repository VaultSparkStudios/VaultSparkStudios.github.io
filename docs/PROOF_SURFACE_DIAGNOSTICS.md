# Proof Surface Diagnostics

Generated: 2026-11-23T14:06:44.987Z
Receipt: `5b47898b9db96ccf39deb512` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 38.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 1.7s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 1.5s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 1.4s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 1.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 1.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 0.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 46 | blocking | 0.8s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 35 | blocking | 0.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 88 | blocking | 0.6s | 1 | `node scripts/check-receipt-ordering.mjs` |
| 82 | blocking | 0.6s | 0 | `node scripts/build-route-consolidation.mjs --check` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
