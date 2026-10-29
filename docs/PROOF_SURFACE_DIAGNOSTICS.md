# Proof Surface Diagnostics

Generated: 2026-10-29T19:34:49.611Z
Receipt: `cd68cd2dbc18beb2ceb975f9` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 283.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 22.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 12.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 11.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 90 | blocking | 8.9s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 24 | blocking | 8.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 18 | blocking | 8.5s | 0 | `node scripts/check-videogame-schema.mjs` |
| 65 | blocking | 7.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 106 | advisory | 7.0s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 38 | blocking | 7.0s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 51 | blocking | 5.1s | 0 | `node scripts/check-trust-feed-freshness.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
