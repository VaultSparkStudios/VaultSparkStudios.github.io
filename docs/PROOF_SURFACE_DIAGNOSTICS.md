# Proof Surface Diagnostics

Generated: 2026-09-07T05:06:11.787Z
Receipt: `1bfc98b9822cfb761e8c43b9` · coverage 107/107

Latest: **105/107** passed · blocking 90/90 · advisory findings 2/17 · total 47.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 1.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 44 | blocking | 1.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 33 | blocking | 1.2s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 90 | blocking | 0.9s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 36 | blocking | 0.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 26 | blocking | 0.9s | 0 | `node scripts/check-project-links.mjs` |
| 35 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 34 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 104 | advisory | 0.8s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 38 | blocking | 0.7s | 0 | `node scripts/build-newsroom-run.mjs --check` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
