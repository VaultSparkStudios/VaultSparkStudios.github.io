# Proof Surface Diagnostics

Generated: 2026-10-08T15:22:06.673Z
Receipt: `a573a2a512afa5428d74b1f4` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 68.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 4.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 3.9s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 35 | blocking | 3.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 37 | blocking | 2.2s | 0 | `node scripts/build-news-desk.mjs --check` |
| 11 | blocking | 1.8s | 0 | `node scripts/check-og-images.mjs` |
| 65 | blocking | 1.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 50 | blocking | 1.7s | 0 | `node scripts/check-trust-feed-freshness.mjs --self-test` |
| 22 | blocking | 1.5s | 0 | `node scripts/check-schema-coverage.mjs` |
| 62 | blocking | 1.4s | 0 | `node scripts/build-leaderboard-subpages.mjs --check` |
| 108 | advisory | 1.4s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
