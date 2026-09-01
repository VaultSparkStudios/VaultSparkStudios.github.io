# Proof Surface Diagnostics

Generated: 2026-09-01T12:56:44.893Z
Receipt: `a9b2746686d7fdef0715404a` · coverage 76/107

Latest: **75/76** passed · blocking 75/76 · advisory findings 0/0 · total 52.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 59 | blocking | 2.0s | 0 | `node scripts/build-proposed-edges.mjs --check` |
| 17 | blocking | 1.7s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 47 | blocking | 1.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 1.4s | 0 | `node scripts/build-news-desk.mjs --check` |
| 36 | blocking | 1.2s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 33 | blocking | 1.2s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 40 | blocking | 1.1s | 0 | `node scripts/check-intelligence-hydration.mjs` |
| 16 | blocking | 1.0s | 0 | `node scripts/check-videogame-schema.mjs` |
| 22 | blocking | 1.0s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 42 | blocking | 1.0s | 0 | `node scripts/build-velocity-series.mjs --check` |

## Failures

- Step 76 [blocking]: `node scripts/build-news-visual-receipts.mjs --check` exited 1 — self/contract
