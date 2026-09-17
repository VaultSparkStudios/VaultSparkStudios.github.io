# Proof Surface Diagnostics

Generated: 2026-09-17T08:40:33.378Z
Receipt: `00ccf1c7137ec0ddfa03cede` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 12.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 46 | blocking | 1.9s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 49 | blocking | 0.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 78 | blocking | 0.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 43 | blocking | 0.3s | 0 | `node scripts/build-velocity-series.mjs --self-test` |
| 37 | blocking | 0.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 35 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 44 | blocking | 0.2s | 0 | `node scripts/build-velocity-series.mjs --check` |
| 45 | blocking | 0.2s | 0 | `node scripts/derive-game-nav.mjs --self-test` |
| 47 | blocking | 0.2s | 0 | `node scripts/derive-game-index.mjs --self-test` |
| 14 | blocking | 0.2s | 0 | `node scripts/build-og-cards.mjs --self-test` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
