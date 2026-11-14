# Proof Surface Diagnostics

Generated: 2026-11-14T02:53:25.956Z
Receipt: `eeb5f6360e9618b78a19656c` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 29.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 2.5s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 2.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 1.5s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 1.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 90 | blocking | 1.2s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 65 | blocking | 1.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 92 | blocking | 1.0s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 22 | blocking | 0.8s | 0 | `node scripts/check-schema-coverage.mjs` |
| 35 | blocking | 0.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 46 | blocking | 0.8s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
