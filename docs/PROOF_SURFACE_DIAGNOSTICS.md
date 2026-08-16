# Proof Surface Diagnostics

Generated: 2026-08-16T04:58:47.913Z
Receipt: `4eea1139ac0da2ffac2ad71e` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 25.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 45 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 18 | blocking | 0.7s | 0 | `node scripts/enrich-projects-schema.mjs --check` |
| 33 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 52 | blocking | 0.5s | 0 | `node scripts/check-journal-dates.mjs --self-test` |
| 12 | blocking | 0.5s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 42 | blocking | 0.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 73 | advisory | 0.5s | 0 | `node scripts/check-identity-coherence.mjs` |
| 77 | advisory | 0.4s | 0 | `node scripts/build-cta-state.mjs --check` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 16 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |

## Failures

- None.
