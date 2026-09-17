# Proof Surface Diagnostics

Generated: 2026-09-17T10:24:44.192Z
Receipt: `234102c2bba4e48a03061dc1` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 10.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 0.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 78 | blocking | 0.3s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 0.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 46 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 14 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 35 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 24 | blocking | 0.2s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 18 | blocking | 0.2s | 0 | `node scripts/check-videogame-schema.mjs` |
| 7 | blocking | 0.2s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |
| 38 | blocking | 0.2s | 0 | `node scripts/generate-news-pages.mjs --check` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
