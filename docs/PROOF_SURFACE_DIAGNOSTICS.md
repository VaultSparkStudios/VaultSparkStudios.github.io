# Proof Surface Diagnostics

Generated: 2026-08-26T07:36:08.937Z
Receipt: `5eb914ae59049bf19bf7f67e` · coverage 89/89

Latest: **88/89** passed · blocking 72/72 · advisory findings 1/17 · total 92.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 33 | blocking | 3.0s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 44 | blocking | 2.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 47 | blocking | 2.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 59 | blocking | 2.1s | 0 | `node scripts/build-proposed-edges.mjs --check` |
| 60 | blocking | 2.0s | 0 | `node scripts/build-leaderboard-subpages.mjs --check` |
| 86 | advisory | 1.9s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 61 | blocking | 1.9s | 0 | `node scripts/check-sitemap-coverage.mjs` |
| 58 | blocking | 1.8s | 0 | `node scripts/build-proposed-edges.mjs --self-test` |
| 63 | blocking | 1.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 50 | blocking | 1.7s | 0 | `node scripts/check-feed-publisher-manifest.mjs --self-test` |

## Failures

- Step 89 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
