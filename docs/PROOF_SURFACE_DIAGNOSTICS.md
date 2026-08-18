# Proof Surface Diagnostics

Generated: 2026-08-18T04:22:40.173Z
Receipt: `6865660b14139707f2594ba0` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 26.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 45 | blocking | 0.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 0.5s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 33 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 42 | blocking | 0.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 83 | advisory | 0.4s | 0 | `node scripts/check-lighthouse-trend.mjs` |
| 59 | blocking | 0.4s | 0 | `node scripts/check-sitemap-coverage.mjs` |
| 36 | blocking | 0.4s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 55 | blocking | 0.4s | 0 | `node scripts/check-decision-currency.mjs` |
| 12 | blocking | 0.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 82 | advisory | 0.4s | 0 | `node scripts/generate-build-sha.mjs --check` |

## Failures

- None.
