# Proof Surface Diagnostics

Generated: 2026-08-19T04:51:12.347Z
Receipt: `d07d99e15089220237a270e7` · coverage 86/86

Latest: **85/86** passed · blocking 70/70 · advisory findings 1/16 · total 6.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 12 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 35 | blocking | 0.2s | 0 | `node scripts/build-news-desk.mjs --check` |
| 45 | blocking | 0.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 42 | blocking | 0.1s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 36 | blocking | 0.1s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 33 | blocking | 0.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 34 | blocking | 0.1s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 13 | blocking | 0.1s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |
| 14 | blocking | 0.1s | 0 | `node scripts/inject-collection-jsonld.mjs --check` |
| 22 | blocking | 0.1s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 84 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
