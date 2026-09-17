# Proof Surface Diagnostics

Generated: 2026-09-17T07:28:24.614Z
Receipt: `cb084ea2d1d1367d12e833d1` · coverage 90/109

Latest: **89/90** passed · blocking 89/90 · advisory findings 0/0 · total 17.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 46 | blocking | 1.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 49 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 78 | blocking | 0.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 11 | blocking | 0.4s | 0 | `node scripts/check-og-images.mjs` |
| 35 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 14 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 36 | blocking | 0.3s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 38 | blocking | 0.3s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 18 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |

## Failures

- Step 90 [blocking]: `node scripts/check-visual-qa-retention.mjs --check` exited 1 — self/contract
