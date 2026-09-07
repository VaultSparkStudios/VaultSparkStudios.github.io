# Proof Surface Diagnostics

Generated: 2026-09-07T19:15:02.252Z
Receipt: `cfe395e11580823435b20592` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 90.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 3.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 86 | blocking | 2.3s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 33 | blocking | 2.2s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 44 | blocking | 2.2s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 76 | blocking | 2.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 35 | blocking | 1.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 57 | blocking | 1.5s | 0 | `node scripts/check-decision-currency.mjs` |
| 34 | blocking | 1.4s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 68 | blocking | 1.4s | 0 | `node scripts/check-project-status-coherence.mjs --self-test` |
| 36 | blocking | 1.4s | 0 | `node scripts/generate-news-pages.mjs --check` |

## Failures

- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
