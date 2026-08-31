# Proof Surface Diagnostics

Generated: 2026-08-31T05:11:40.460Z
Receipt: `97b3235fe5cdedcb90c1d752` · coverage 107/107

Latest: **104/107** passed · blocking 90/90 · advisory findings 3/17 · total 196.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 7.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 29 | blocking | 5.7s | 0 | `node scripts/build-portfolio-counts.mjs --self-test` |
| 11 | blocking | 5.0s | 0 | `node scripts/build-og-coverage.mjs --check` |
| 13 | blocking | 4.6s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |
| 105 | advisory | 4.1s | 0 | `node scripts/check-lighthouse-trend.mjs` |
| 30 | blocking | 4.1s | 0 | `node scripts/build-portfolio-counts.mjs --check` |
| 12 | blocking | 4.0s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 10 | blocking | 3.9s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 104 | advisory | 3.7s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 68 | blocking | 3.5s | 0 | `node scripts/check-project-status-coherence.mjs --self-test` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
