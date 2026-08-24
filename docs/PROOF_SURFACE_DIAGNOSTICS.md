# Proof Surface Diagnostics

Generated: 2026-08-24T02:02:40.328Z
Receipt: `1e4fb3b0edecbda75865c4aa` · coverage 89/89

Latest: **88/89** passed · blocking 72/72 · advisory findings 1/17 · total 106.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 44 | blocking | 6.0s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 40 | blocking | 3.4s | 0 | `node scripts/check-intelligence-hydration.mjs` |
| 47 | blocking | 3.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 36 | blocking | 2.6s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 41 | blocking | 2.5s | 0 | `node scripts/build-velocity-series.mjs --self-test` |
| 42 | blocking | 2.5s | 0 | `node scripts/build-velocity-series.mjs --check` |
| 39 | blocking | 2.4s | 0 | `node scripts/check-intelligence-hydration.mjs --self-test` |
| 34 | blocking | 2.3s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 12 | blocking | 2.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 37 | blocking | 2.2s | 0 | `node scripts/build-newsroom-run.mjs --self-test` |

## Failures

- Step 89 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
