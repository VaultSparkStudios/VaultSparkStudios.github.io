# Proof Surface Diagnostics

Generated: 2026-08-03T20:46:51.533Z
Receipt: `9b2d18e279d29dffe3f11be5` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 18.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 33 | blocking | 0.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 9 | blocking | 0.6s | 0 | `node scripts/check-og-images.mjs` |
| 10 | blocking | 0.4s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 43 | blocking | 0.4s | 0 | `node scripts/check-trust-feed-freshness.mjs --self-test` |
| 18 | blocking | 0.4s | 0 | `node scripts/enrich-projects-schema.mjs --check` |
| 36 | blocking | 0.4s | 0 | `node scripts/build-velocity-series.mjs --self-test` |
| 61 | blocking | 0.4s | 0 | `node scripts/check-worker-rewriter-safety.mjs --self-test` |
| 79 | advisory | 0.4s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 42 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 25 | blocking | 0.3s | 0 | `node scripts/check-project-links.mjs --self-test` |

## Failures

- None.
