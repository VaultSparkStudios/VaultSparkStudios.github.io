# Proof Surface Diagnostics

Generated: 2026-10-06T10:50:13.404Z
Receipt: `ac5147c38747dc20fcc0805c` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 29.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 106 | advisory | 1.0s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 19 | blocking | 0.9s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 24 | blocking | 0.7s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 82 | blocking | 0.7s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 22 | blocking | 0.7s | 0 | `node scripts/check-schema-coverage.mjs` |
| 37 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 14 | blocking | 0.6s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 78 | blocking | 0.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
