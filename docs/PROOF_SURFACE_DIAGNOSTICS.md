# Proof Surface Diagnostics

Generated: 2026-09-15T07:01:02.433Z
Receipt: `84410232f1349f3cef81e9eb` · coverage 90/109

Latest: **89/90** passed · blocking 89/90 · advisory findings 0/0 · total 36.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 46 | blocking | 1.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 49 | blocking | 1.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 88 | blocking | 0.9s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 48 | blocking | 0.8s | 0 | `node scripts/derive-game-index.mjs --check` |
| 78 | blocking | 0.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 35 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 37 | blocking | 0.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 11 | blocking | 0.7s | 0 | `node scripts/check-og-images.mjs` |
| 24 | blocking | 0.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 38 | blocking | 0.6s | 0 | `node scripts/generate-news-pages.mjs --check` |

## Failures

- Step 90 [blocking]: `node scripts/check-visual-qa-retention.mjs --check` exited 1 — self/contract
