# Proof Surface Diagnostics

Generated: 2026-08-01T23:55:31.799Z
Receipt: `4d820aa3f2cbcd11f136991f` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 77.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 33 | blocking | 2.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 79 | advisory | 2.1s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 72 | advisory | 1.8s | 0 | `node scripts/build-constellation-activity.mjs --check` |
| 42 | blocking | 1.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 12 | blocking | 1.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 27 | blocking | 1.4s | 0 | `node scripts/build-forge-project-pages.mjs --self-test` |
| 74 | advisory | 1.4s | 0 | `node scripts/build-cta-state.mjs --check` |
| 78 | advisory | 1.4s | 0 | `node scripts/check-nav-catalog-sync.mjs` |
| 80 | advisory | 1.3s | 0 | `node scripts/check-lighthouse-trend.mjs` |
| 31 | blocking | 1.3s | 0 | `node scripts/check-registry-freshness.mjs --self-test` |

## Failures

- None.
