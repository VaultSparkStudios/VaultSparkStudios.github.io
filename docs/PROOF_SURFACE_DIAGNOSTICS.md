# Proof Surface Diagnostics

Generated: 2026-09-03T07:48:00.233Z
Receipt: `2b7dbbae0c62e8abc3fbbd30` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 52.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 1.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 44 | blocking | 1.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 73 | blocking | 1.2s | 0 | `node scripts/build-intelligence-suite.mjs --self-test` |
| 76 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 51 | blocking | 1.1s | 0 | `node scripts/check-feed-publisher-manifest.mjs --check` |
| 75 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --self-test` |
| 41 | blocking | 1.1s | 0 | `node scripts/build-velocity-series.mjs --self-test` |
| 33 | blocking | 1.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 104 | advisory | 1.1s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 97 | advisory | 1.0s | 0 | `node scripts/build-constellation-activity.mjs --check` |

## Failures

- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
