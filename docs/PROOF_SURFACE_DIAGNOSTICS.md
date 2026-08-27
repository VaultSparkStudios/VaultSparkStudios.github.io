# Proof Surface Diagnostics

Generated: 2026-08-27T08:27:12.063Z
Receipt: `975f738efc0424b67f6cc1d9` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 197.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 90 | blocking | 24.1s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 76 | blocking | 10.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 82 | blocking | 4.4s | 0 | `node scripts/check-cache-evidence-classification.mjs` |
| 100 | advisory | 4.3s | 0 | `node scripts/build-hero-portfolio.mjs --check` |
| 77 | blocking | 3.8s | 0 | `node scripts/build-projects-catalog.mjs --self-test` |
| 74 | blocking | 3.8s | 0 | `node scripts/build-intelligence-suite.mjs --check` |
| 103 | advisory | 3.8s | 0 | `node scripts/check-nav-catalog-sync.mjs` |
| 47 | blocking | 3.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 101 | advisory | 3.7s | 0 | `node scripts/build-atlas.mjs --check` |
| 81 | blocking | 3.4s | 0 | `node scripts/check-cache-evidence-classification.mjs --self-test` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
