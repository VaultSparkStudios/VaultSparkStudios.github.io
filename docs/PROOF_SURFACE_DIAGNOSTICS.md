# Proof Surface Diagnostics

Generated: 2026-09-03T01:46:41.621Z
Receipt: `f2f5ee3b4bdb79577cac37d9` · coverage 107/107

Latest: **105/107** passed · blocking 90/90 · advisory findings 2/17 · total 20.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 12 | blocking | 1.5s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 47 | blocking | 0.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 44 | blocking | 0.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 33 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 90 | blocking | 0.3s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 86 | blocking | 0.3s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 76 | blocking | 0.3s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 35 | blocking | 0.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 22 | blocking | 0.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 16 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
