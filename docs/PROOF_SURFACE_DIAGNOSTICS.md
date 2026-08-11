# Proof Surface Diagnostics

Generated: 2026-08-10T23:51:56.728Z
Receipt: `ab4817890da814ab5de577ed` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 56.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 3.0s | 0 | `node scripts/check-og-images.mjs` |
| 33 | blocking | 2.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 60 | blocking | 1.8s | 0 | `node scripts/check-content-coherence.mjs --self-test` |
| 15 | blocking | 1.7s | 0 | `node scripts/check-videogame-schema.mjs --self-test` |
| 50 | blocking | 1.7s | 0 | `node scripts/build-vault-momentum.mjs --self-test` |
| 51 | blocking | 1.4s | 0 | `node scripts/build-vault-momentum.mjs --check` |
| 61 | blocking | 1.3s | 0 | `node scripts/check-content-coherence.mjs` |
| 41 | blocking | 1.2s | 0 | `node scripts/derive-game-nav.mjs --self-test` |
| 46 | blocking | 1.2s | 0 | `node scripts/check-trust-feed-freshness.mjs --self-test` |
| 79 | advisory | 1.2s | 0 | `node scripts/build-atlas.mjs --check` |

## Failures

- None.
