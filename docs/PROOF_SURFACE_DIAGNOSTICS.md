# Proof Surface Diagnostics

Generated: 2026-10-06T18:53:53.148Z
Receipt: `458c3b8f20f73037fc8addf3` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 44.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 82 | blocking | 2.6s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 49 | blocking | 2.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 1.7s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 24 | blocking | 1.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 35 | blocking | 1.2s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 1.1s | 0 | `node scripts/check-schema-coverage.mjs` |
| 37 | blocking | 1.1s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 1.0s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 58 | blocking | 1.0s | 0 | `node scripts/check-decision-currency.mjs --self-test` |
| 68 | blocking | 1.0s | 0 | `node scripts/check-worker-rewriter-safety.mjs --self-test` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
