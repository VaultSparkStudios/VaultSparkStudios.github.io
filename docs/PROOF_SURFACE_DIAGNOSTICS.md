# Proof Surface Diagnostics

Generated: 2026-09-17T08:58:35.886Z
Receipt: `5d12346ad8f061ae0e5ec50e` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 10.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 0.5s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 46 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 35 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 37 | blocking | 0.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 14 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 11 | blocking | 0.2s | 0 | `node scripts/check-og-images.mjs` |
| 24 | blocking | 0.2s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 38 | blocking | 0.2s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 18 | blocking | 0.2s | 0 | `node scripts/check-videogame-schema.mjs` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
