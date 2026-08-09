# Proof Surface Diagnostics

Generated: 2026-08-09T09:53:22.090Z
Receipt: `3e540ba7efd996cbea266525` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 61.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 2.7s | 0 | `node scripts/check-og-images.mjs` |
| 22 | blocking | 1.9s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 42 | blocking | 1.9s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 33 | blocking | 1.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 16 | blocking | 1.6s | 0 | `node scripts/check-videogame-schema.mjs` |
| 12 | blocking | 1.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 51 | blocking | 1.4s | 0 | `node scripts/build-vault-momentum.mjs --check` |
| 35 | blocking | 1.4s | 0 | `node scripts/build-news-desk.mjs --check` |
| 79 | advisory | 1.3s | 0 | `node scripts/build-atlas.mjs --check` |
| 52 | blocking | 1.1s | 0 | `node scripts/check-journal-dates.mjs --self-test` |

## Failures

- None.
