# Proof Surface Diagnostics

Generated: 2026-09-23T03:25:00.199Z
Receipt: `f26e967f33b70fe4eae847b3` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 34.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 50 | blocking | 1.4s | 0 | `node scripts/check-trust-feed-freshness.mjs --self-test` |
| 49 | blocking | 1.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 0.8s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 41 | blocking | 0.8s | 0 | `node scripts/check-intelligence-hydration.mjs --self-test` |
| 78 | blocking | 0.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 0.7s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 14 | blocking | 0.7s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 46 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 24 | blocking | 0.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 35 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
