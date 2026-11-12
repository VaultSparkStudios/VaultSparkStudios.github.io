# Proof Surface Diagnostics

Generated: 2026-11-12T09:54:11.149Z
Receipt: `353c2fb8c2d5399c1d799d56` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 21.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 1.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 1.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 1.2s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 0.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 0.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 92 | blocking | 0.8s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 90 | blocking | 0.8s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 22 | blocking | 0.7s | 0 | `node scripts/check-schema-coverage.mjs` |
| 46 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 35 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
