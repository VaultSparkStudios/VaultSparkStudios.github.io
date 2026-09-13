# Proof Surface Diagnostics

Generated: 2026-09-13T06:34:45.398Z
Receipt: `97a1dde1e7a849b041e4eb83` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 5.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 14 | blocking | 0.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 37 | blocking | 0.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 0.3s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 0.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 38 | blocking | 0.1s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 46 | blocking | 0.1s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 73 | blocking | 0.1s | 0 | `node scripts/check-phantom-carries.mjs` |
| 71 | blocking | 0.1s | 0 | `node scripts/check-project-status-coherence.mjs` |
| 36 | blocking | 0.1s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 35 | blocking | 0.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
