# Proof Surface Diagnostics

Generated: 2026-08-19T02:41:17.453Z
Receipt: `f8253627fa7367d19520f580` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 27.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 45 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 0.8s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 16 | blocking | 0.6s | 0 | `node scripts/check-videogame-schema.mjs` |
| 33 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 12 | blocking | 0.6s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 42 | blocking | 0.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 36 | blocking | 0.5s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 82 | advisory | 0.5s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 68 | blocking | 0.5s | 0 | `node scripts/check-phantom-carries.mjs --self-test` |
| 72 | advisory | 0.5s | 0 | `node scripts/check-public-note-freshness.mjs` |

## Failures

- None.
