# Proof Surface Diagnostics

Generated: 2026-10-24T23:24:01.208Z
Receipt: `014d43b4a834a99a29177eb1` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 35.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 65 | blocking | 2.0s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 1.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 1.2s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 24 | blocking | 1.2s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 18 | blocking | 1.2s | 0 | `node scripts/check-videogame-schema.mjs` |
| 106 | advisory | 1.1s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 82 | blocking | 1.0s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 45 | blocking | 0.9s | 0 | `node scripts/derive-game-nav.mjs --self-test` |
| 37 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 0.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |

## Failures

- None.
