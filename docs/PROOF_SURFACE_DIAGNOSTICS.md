# Proof Surface Diagnostics

Generated: 2026-10-15T01:27:02.343Z
Receipt: `d84908aa0e2d7ff4600bbc2b` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 11.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 0.7s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 0.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 0.5s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 0.4s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 92 | blocking | 0.4s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 46 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 35 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 106 | advisory | 0.2s | 1 | `node scripts/generate-build-sha.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
