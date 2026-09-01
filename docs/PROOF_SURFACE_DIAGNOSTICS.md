# Proof Surface Diagnostics

Generated: 2026-09-01T23:52:04.976Z
Receipt: `6c7445dfe1a32e014b3e8e3c` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 14.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 12 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 44 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 90 | blocking | 0.3s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 33 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 16 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |
| 76 | blocking | 0.3s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 9 | blocking | 0.3s | 0 | `node scripts/check-og-images.mjs` |
| 86 | blocking | 0.2s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 22 | blocking | 0.2s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
