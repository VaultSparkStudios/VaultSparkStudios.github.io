# Proof Surface Diagnostics

Generated: 2026-11-08T13:16:42.215Z
Receipt: `2dd2eb75c857d0d4a55263e5` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 35.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 1.7s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 1.5s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 1.4s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 1.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 1.0s | 0 | `node scripts/check-content-coherence.mjs` |
| 90 | blocking | 1.0s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 92 | blocking | 0.9s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 22 | blocking | 0.8s | 0 | `node scripts/check-schema-coverage.mjs` |
| 35 | blocking | 0.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 46 | blocking | 0.7s | 0 | `node scripts/derive-game-nav.mjs --check` |

## Failures

- None.
