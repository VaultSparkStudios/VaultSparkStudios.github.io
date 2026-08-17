# Proof Surface Diagnostics

Generated: 2026-08-17T17:35:58.945Z
Receipt: `eaa021d294436bfa98d10218` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 47.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 42 | blocking | 1.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 22 | blocking | 1.1s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 46 | blocking | 1.1s | 0 | `node scripts/check-trust-feed-freshness.mjs --self-test` |
| 45 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 47 | blocking | 1.0s | 0 | `node scripts/check-trust-feed-freshness.mjs` |
| 63 | blocking | 1.0s | 0 | `node scripts/build-oracle-answers.mjs --check` |
| 21 | blocking | 1.0s | 0 | `node scripts/check-game-playability-coherence.mjs --self-test` |
| 16 | blocking | 0.9s | 0 | `node scripts/check-videogame-schema.mjs` |
| 73 | advisory | 0.9s | 0 | `node scripts/check-identity-coherence.mjs` |
| 20 | blocking | 0.9s | 0 | `node scripts/check-schema-coverage.mjs` |

## Failures

- None.
