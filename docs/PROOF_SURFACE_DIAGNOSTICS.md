# Proof Surface Diagnostics

Generated: 2026-08-08T18:23:23.289Z
Receipt: `bf4af383230001e311236b23` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 51.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 33 | blocking | 2.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 2.1s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 45 | blocking | 1.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 16 | blocking | 1.6s | 0 | `node scripts/check-videogame-schema.mjs` |
| 42 | blocking | 1.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 77 | advisory | 1.6s | 0 | `node scripts/build-cta-state.mjs --check` |
| 9 | blocking | 1.4s | 0 | `node scripts/check-og-images.mjs` |
| 15 | blocking | 1.4s | 0 | `node scripts/check-videogame-schema.mjs --self-test` |
| 39 | blocking | 1.3s | 0 | `node scripts/build-velocity-series.mjs --self-test` |
| 67 | blocking | 1.1s | 0 | `node scripts/check-project-status-coherence.mjs` |

## Failures

- None.
