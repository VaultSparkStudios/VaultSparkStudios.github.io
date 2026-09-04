# Proof Surface Diagnostics

Generated: 2026-09-04T03:10:12.726Z
Receipt: `d9da3f75531ab42532e39044` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 27.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 104 | advisory | 0.6s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 44 | blocking | 0.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 76 | blocking | 0.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 12 | blocking | 0.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 80 | blocking | 0.4s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 33 | blocking | 0.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 35 | blocking | 0.4s | 0 | `node scripts/build-news-desk.mjs --check` |
| 16 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |

## Failures

- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
