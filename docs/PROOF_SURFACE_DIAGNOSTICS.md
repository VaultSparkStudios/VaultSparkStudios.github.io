# Proof Surface Diagnostics

Generated: 2026-09-02T04:43:12.453Z
Receipt: `faa7f78e7f25fcac5f48ac55` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 14.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 44 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 86 | blocking | 0.3s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 16 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |
| 12 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 76 | blocking | 0.3s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 22 | blocking | 0.2s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 90 | blocking | 0.2s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 104 | advisory | 0.2s | 0 | `node scripts/generate-build-sha.mjs --check` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
