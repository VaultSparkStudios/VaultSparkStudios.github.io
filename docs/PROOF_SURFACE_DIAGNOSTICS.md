# Proof Surface Diagnostics

Generated: 2026-09-17T19:33:33.779Z
Receipt: `3cee0a8598b3d990fc191004` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 32.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 88 | blocking | 0.9s | 1 | `node scripts/check-receipt-ordering.mjs` |
| 78 | blocking | 0.9s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 46 | blocking | 0.8s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 87 | blocking | 0.7s | 0 | `node scripts/check-receipt-ordering.mjs --self-test` |
| 82 | blocking | 0.6s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 64 | blocking | 0.6s | 0 | `node scripts/check-content-coherence.mjs --self-test` |
| 35 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 59 | blocking | 0.6s | 0 | `node scripts/check-decision-currency.mjs` |
| 14 | blocking | 0.6s | 0 | `node scripts/build-og-cards.mjs --self-test` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
