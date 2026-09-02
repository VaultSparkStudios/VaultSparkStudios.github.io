# Proof Surface Diagnostics

Generated: 2026-09-02T09:06:05.959Z
Receipt: `49ae4f5f192a45b2c9c9f07f` · coverage 107/107

Latest: **105/107** passed · blocking 90/90 · advisory findings 2/17 · total 20.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 0.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 44 | blocking | 0.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 80 | blocking | 0.4s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 86 | blocking | 0.4s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 76 | blocking | 0.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 12 | blocking | 0.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 16 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |
| 90 | blocking | 0.3s | 0 | `node scripts/generate-sitemap.mjs --check` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
