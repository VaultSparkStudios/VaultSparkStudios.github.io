# Proof Surface Diagnostics

Generated: 2026-09-14T07:45:24.132Z
Receipt: `deb1ae44284e89e122144cb5` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 114.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 11 | blocking | 5.9s | 0 | `node scripts/check-og-images.mjs` |
| 46 | blocking | 5.0s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 49 | blocking | 2.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 24 | blocking | 2.5s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 92 | blocking | 2.3s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 78 | blocking | 2.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 35 | blocking | 1.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 38 | blocking | 1.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 29 | blocking | 1.6s | 0 | `node scripts/build-forge-project-pages.mjs --self-test` |
| 39 | blocking | 1.6s | 0 | `node scripts/build-newsroom-run.mjs --self-test` |

## Failures

- None.
