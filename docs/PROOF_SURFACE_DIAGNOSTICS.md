# Proof Surface Diagnostics

Generated: 2026-08-16T02:55:04.035Z
Receipt: `dff39d3aad0755e2ff019190` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 22.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 1.0s | 0 | `node scripts/check-og-images.mjs` |
| 12 | blocking | 0.7s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 45 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 13 | blocking | 0.6s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |
| 11 | blocking | 0.6s | 0 | `node scripts/build-og-coverage.mjs --check` |
| 42 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 82 | advisory | 0.5s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 10 | blocking | 0.5s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 5 | blocking | 0.5s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |
| 33 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- None.
