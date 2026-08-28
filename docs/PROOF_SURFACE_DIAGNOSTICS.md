# Proof Surface Diagnostics

Generated: 2026-08-28T19:39:22.651Z
Receipt: `c1662343ca3976fda71d32f9` · coverage 107/107

Latest: **105/107** passed · blocking 90/90 · advisory findings 2/17 · total 67.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 2.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 1.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 77 | blocking | 1.6s | 0 | `node scripts/build-projects-catalog.mjs --self-test` |
| 104 | advisory | 1.6s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 44 | blocking | 1.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 34 | blocking | 1.3s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 78 | blocking | 1.2s | 0 | `node scripts/build-projects-catalog.mjs --check` |
| 35 | blocking | 1.2s | 0 | `node scripts/build-news-desk.mjs --check` |
| 55 | blocking | 1.1s | 0 | `node scripts/check-journal-dates.mjs` |
| 75 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --self-test` |

## Failures

- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
