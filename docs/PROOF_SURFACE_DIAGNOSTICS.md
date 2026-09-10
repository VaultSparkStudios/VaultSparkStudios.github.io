# Proof Surface Diagnostics

Generated: 2026-09-10T07:39:59.859Z
Receipt: `2dc6f0fa1b7c589593384cd4` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 22.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 0.5s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 24 | blocking | 0.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 35 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 46 | blocking | 0.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 14 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 18 | blocking | 0.3s | 0 | `node scripts/check-videogame-schema.mjs` |
| 58 | blocking | 0.3s | 0 | `node scripts/check-decision-currency.mjs --self-test` |
| 75 | blocking | 0.3s | 0 | `node scripts/build-intelligence-suite.mjs --self-test` |
| 64 | blocking | 0.3s | 0 | `node scripts/check-content-coherence.mjs --self-test` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
