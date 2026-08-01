# Proof Surface Diagnostics

Generated: 2026-08-01T22:26:10.089Z
Receipt: `e04d788167571a4cb4e0361f` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 17.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 12 | blocking | 0.7s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 3 | blocking | 0.5s | 0 | `node scripts/build-security-posture.mjs --self-test` |
| 33 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 17 | blocking | 0.4s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 42 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 23 | blocking | 0.4s | 0 | `node scripts/check-hero-spotlight-coherence.mjs --self-test` |
| 79 | advisory | 0.4s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 39 | blocking | 0.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 16 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 54 | blocking | 0.4s | 0 | `node scripts/build-proposed-edges.mjs --check` |

## Failures

- None.
