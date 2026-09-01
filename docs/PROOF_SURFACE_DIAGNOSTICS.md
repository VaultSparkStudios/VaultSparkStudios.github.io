# Proof Surface Diagnostics

Generated: 2026-09-01T13:37:48.003Z
Receipt: `e1e2df28ec469998c682610c` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 69.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 16 | blocking | 1.5s | 0 | `node scripts/check-videogame-schema.mjs` |
| 47 | blocking | 1.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 96 | advisory | 1.5s | 0 | `node scripts/build-oracle-query-insights.mjs --check` |
| 76 | blocking | 1.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 33 | blocking | 1.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 49 | blocking | 1.3s | 0 | `node scripts/check-trust-feed-freshness.mjs` |
| 20 | blocking | 1.3s | 0 | `node scripts/check-schema-coverage.mjs` |
| 22 | blocking | 1.2s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 104 | advisory | 1.1s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 95 | advisory | 1.1s | 0 | `node scripts/check-identity-coherence.mjs` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
