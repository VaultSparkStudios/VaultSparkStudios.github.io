# Proof Surface Diagnostics

Generated: 2026-09-02T04:20:49.158Z
Receipt: `b86719d4e5c50e21a808a2f6` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 36.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 44 | blocking | 1.2s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 86 | blocking | 1.1s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 47 | blocking | 1.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 0.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 16 | blocking | 0.9s | 0 | `node scripts/check-videogame-schema.mjs` |
| 90 | blocking | 0.7s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 76 | blocking | 0.7s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 12 | blocking | 0.6s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 9 | blocking | 0.5s | 0 | `node scripts/check-og-images.mjs` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
