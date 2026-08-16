# Proof Surface Diagnostics

Generated: 2026-08-16T04:34:02.663Z
Receipt: `841e2e97083e1a8c5541408f` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 77.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 3.0s | 0 | `node scripts/check-og-images.mjs` |
| 12 | blocking | 2.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 45 | blocking | 2.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 11 | blocking | 2.1s | 0 | `node scripts/build-og-coverage.mjs --check` |
| 13 | blocking | 1.8s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |
| 33 | blocking | 1.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 42 | blocking | 1.7s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 35 | blocking | 1.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 71 | advisory | 1.6s | 0 | `node scripts/check-dead-ctas.mjs --check` |
| 14 | blocking | 1.6s | 0 | `node scripts/inject-collection-jsonld.mjs --check` |

## Failures

- None.
