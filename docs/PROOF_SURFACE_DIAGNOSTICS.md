# Proof Surface Diagnostics

Generated: 2026-09-02T06:12:54.607Z
Receipt: `e1e29637d0c028210046c3ef` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 23.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 33 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 47 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 44 | blocking | 0.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 9 | blocking | 0.4s | 0 | `node scripts/check-og-images.mjs` |
| 69 | blocking | 0.4s | 0 | `node scripts/check-project-status-coherence.mjs` |
| 90 | blocking | 0.4s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 22 | blocking | 0.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 12 | blocking | 0.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 36 | blocking | 0.4s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 35 | blocking | 0.4s | 0 | `node scripts/build-news-desk.mjs --check` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
