# Proof Surface Diagnostics

Generated: 2026-09-02T00:55:52.041Z
Receipt: `ba0bf381898cc9a5c0ed42f9` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 16.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 33 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 47 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 44 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 86 | blocking | 0.3s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 90 | blocking | 0.3s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 9 | blocking | 0.3s | 0 | `node scripts/check-og-images.mjs` |
| 12 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 76 | blocking | 0.3s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 22 | blocking | 0.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 35 | blocking | 0.3s | 0 | `node scripts/build-news-desk.mjs --check` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
