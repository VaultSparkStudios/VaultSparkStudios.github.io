# Proof Surface Diagnostics

Generated: 2026-08-03T07:41:03.155Z
Receipt: `1257e057a4ae29d1d71e3262` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 20.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 79 | advisory | 1.0s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 43 | blocking | 1.0s | 0 | `node scripts/check-trust-feed-freshness.mjs --self-test` |
| 42 | blocking | 0.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 33 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 70 | advisory | 0.4s | 0 | `node scripts/check-identity-coherence.mjs` |
| 26 | blocking | 0.4s | 0 | `node scripts/check-project-links.mjs` |
| 71 | advisory | 0.4s | 0 | `node scripts/build-oracle-query-insights.mjs --check` |
| 9 | blocking | 0.4s | 0 | `node scripts/check-og-images.mjs` |
| 16 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
