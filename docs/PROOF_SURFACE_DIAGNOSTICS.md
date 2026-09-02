# Proof Surface Diagnostics

Generated: 2026-09-02T22:12:51.311Z
Receipt: `2491302e8871e6efc506bcb0` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 25.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 0.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 44 | blocking | 0.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 76 | blocking | 0.5s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 87 | blocking | 0.5s | 0 | `node scripts/check-visual-qa-retention.mjs --self-test` |
| 36 | blocking | 0.4s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 90 | blocking | 0.4s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 86 | blocking | 0.4s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 104 | advisory | 0.4s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 70 | blocking | 0.4s | 0 | `node scripts/check-phantom-carries.mjs --self-test` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
