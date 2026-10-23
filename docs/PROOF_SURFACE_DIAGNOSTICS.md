# Proof Surface Diagnostics

Generated: 2026-10-23T08:43:08.798Z
Receipt: `b9fc40103fce50f41f380a42` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 54.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 1.5s | 0 | `node scripts/build-news-desk.mjs --check` |
| 22 | blocking | 1.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 49 | blocking | 1.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.2s | 0 | `node scripts/check-content-coherence.mjs` |
| 106 | advisory | 1.2s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 47 | blocking | 1.1s | 0 | `node scripts/derive-game-index.mjs --self-test` |
| 35 | blocking | 1.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 38 | blocking | 1.0s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 78 | blocking | 1.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 24 | blocking | 1.0s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
