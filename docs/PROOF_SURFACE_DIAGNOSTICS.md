# Proof Surface Diagnostics

Generated: 2026-08-03T22:01:56.841Z
Receipt: `0fac5b251385e48aba836c19` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 24.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 12 | blocking | 0.9s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 42 | blocking | 0.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 43 | blocking | 0.6s | 0 | `node scripts/check-trust-feed-freshness.mjs --self-test` |
| 33 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 36 | blocking | 0.5s | 0 | `node scripts/build-velocity-series.mjs --self-test` |
| 39 | blocking | 0.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 20 | blocking | 0.5s | 0 | `node scripts/check-schema-coverage.mjs` |
| 9 | blocking | 0.5s | 0 | `node scripts/check-og-images.mjs` |
| 78 | advisory | 0.5s | 0 | `node scripts/check-nav-catalog-sync.mjs` |
| 30 | blocking | 0.5s | 0 | `node scripts/build-portfolio-counts.mjs --check` |

## Failures

- None.
