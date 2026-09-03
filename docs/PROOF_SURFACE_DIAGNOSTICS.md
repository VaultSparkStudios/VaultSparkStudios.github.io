# Proof Surface Diagnostics

Generated: 2026-09-03T01:00:57.566Z
Receipt: `1d67dd5bd484ace2b680578d` · coverage 107/107

Latest: **105/107** passed · blocking 90/90 · advisory findings 2/17 · total 25.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 0.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 44 | blocking | 0.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 76 | blocking | 0.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 80 | blocking | 0.4s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 16 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 33 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 12 | blocking | 0.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 90 | blocking | 0.4s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 86 | blocking | 0.4s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 61 | blocking | 0.4s | 0 | `node scripts/check-sitemap-coverage.mjs` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
