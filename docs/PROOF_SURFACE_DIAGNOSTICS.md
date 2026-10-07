# Proof Surface Diagnostics

Generated: 2026-10-07T16:41:12.631Z
Receipt: `5740e66fbc346627a15cf4d0` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 42.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 14 | blocking | 1.5s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 49 | blocking | 1.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 41 | blocking | 1.2s | 0 | `node scripts/check-intelligence-hydration.mjs --self-test` |
| 37 | blocking | 1.2s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 1.2s | 0 | `node scripts/check-content-coherence.mjs` |
| 62 | blocking | 1.1s | 0 | `node scripts/build-leaderboard-subpages.mjs --check` |
| 106 | advisory | 1.1s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 35 | blocking | 1.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 1.0s | 0 | `node scripts/check-schema-coverage.mjs` |
| 39 | blocking | 1.0s | 0 | `node scripts/build-newsroom-run.mjs --self-test` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
