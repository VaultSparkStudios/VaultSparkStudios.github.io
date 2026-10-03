# Proof Surface Diagnostics

Generated: 2026-10-03T17:00:25.026Z
Receipt: `357bd140b3dd8264adac1e74` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 48.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 2.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 11 | blocking | 1.7s | 0 | `node scripts/check-og-images.mjs` |
| 106 | advisory | 1.6s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 65 | blocking | 1.6s | 0 | `node scripts/check-content-coherence.mjs` |
| 18 | blocking | 1.5s | 0 | `node scripts/check-videogame-schema.mjs` |
| 35 | blocking | 1.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 14 | blocking | 1.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 88 | blocking | 1.3s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 22 | blocking | 1.2s | 0 | `node scripts/check-schema-coverage.mjs` |
| 46 | blocking | 1.1s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- Step 103 [advisory]: `node scripts/build-atlas.mjs --check` exited 1 — self/contract
