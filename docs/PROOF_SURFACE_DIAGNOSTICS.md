# Proof Surface Diagnostics

Generated: 2026-07-31T03:00:56.407Z
Receipt: `dbc586f861b7260bf1179e5c` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 14.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 79 | advisory | 0.4s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 16 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 33 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 9 | blocking | 0.4s | 0 | `node scripts/check-og-images.mjs` |
| 42 | blocking | 0.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 39 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 22 | blocking | 0.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 77 | advisory | 0.3s | 0 | `node scripts/check-registry-freshness.mjs` |
| 50 | blocking | 0.2s | 0 | `node scripts/check-journal-dates.mjs` |
| 60 | blocking | 0.2s | 0 | `node scripts/build-oracle-answers.mjs --check` |

## Failures

- None.
