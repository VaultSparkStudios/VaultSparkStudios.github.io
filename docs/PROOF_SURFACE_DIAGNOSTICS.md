# Proof Surface Diagnostics

Generated: 2026-08-31T02:39:49.064Z
Receipt: `fb7e66671d428aa0b43c90e8` · coverage 107/107

Latest: **105/107** passed · blocking 90/90 · advisory findings 2/17 · total 206.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 33 | blocking | 8.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 44 | blocking | 7.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 47 | blocking | 7.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 85 | blocking | 4.1s | 0 | `node scripts/check-receipt-ordering.mjs --self-test` |
| 76 | blocking | 4.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 35 | blocking | 3.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 86 | blocking | 3.3s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 88 | blocking | 3.3s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 45 | blocking | 3.3s | 0 | `node scripts/derive-game-index.mjs --self-test` |
| 92 | advisory | 3.2s | 0 | `node scripts/check-dead-ctas.mjs --check` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
