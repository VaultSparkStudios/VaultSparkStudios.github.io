# Proof Surface Diagnostics

Generated: 2026-08-22T04:19:32.547Z
Receipt: `60a956519baab871e9eb11ef` · coverage 87/87

Latest: **85/87** passed · blocking 70/70 · advisory findings 2/17 · total 5.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 45 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 38 | blocking | 0.3s | 0 | `node scripts/check-intelligence-hydration.mjs` |
| 12 | blocking | 0.2s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 35 | blocking | 0.2s | 0 | `node scripts/build-news-desk.mjs --check` |
| 36 | blocking | 0.1s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 42 | blocking | 0.1s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 16 | blocking | 0.1s | 0 | `node scripts/check-videogame-schema.mjs` |
| 33 | blocking | 0.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 34 | blocking | 0.1s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 85 | advisory | 0.1s | 0 | `node scripts/check-lighthouse-trend.mjs` |

## Failures

- Step 84 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 87 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
