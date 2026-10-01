# Proof Surface Diagnostics

Generated: 2026-10-01T23:04:29.359Z
Receipt: `a751c0a3c17d51359c2d6827` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 23.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 1.0s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 109 | advisory | 0.7s | 0 | `node scripts/build-release-dependencies.mjs --check` |
| 25 | blocking | 0.6s | 0 | `node scripts/check-hero-spotlight-coherence.mjs --self-test` |
| 53 | blocking | 0.5s | 0 | `node scripts/check-feed-publisher-manifest.mjs --check` |
| 78 | blocking | 0.5s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 35 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 42 | blocking | 0.4s | 0 | `node scripts/check-intelligence-hydration.mjs` |
| 82 | blocking | 0.4s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 38 | blocking | 0.4s | 0 | `node scripts/generate-news-pages.mjs --check` |

## Failures

- None.
