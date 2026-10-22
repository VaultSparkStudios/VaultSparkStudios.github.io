# Proof Surface Diagnostics

Generated: 2026-10-22T19:37:21.986Z
Receipt: `6325c0666c32da89fbd9882c` · coverage 88/109

Latest: **87/88** passed · blocking 87/88 · advisory findings 0/0 · total 68.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 6.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 65 | blocking | 3.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 88 | blocking | 2.2s | 1 | `node scripts/check-receipt-ordering.mjs` |
| 55 | blocking | 1.9s | 0 | `node scripts/build-vault-momentum.mjs --check` |
| 80 | blocking | 1.7s | 0 | `node scripts/build-projects-catalog.mjs --check` |
| 35 | blocking | 1.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 57 | blocking | 1.5s | 0 | `node scripts/check-journal-dates.mjs` |
| 37 | blocking | 1.4s | 0 | `node scripts/build-news-desk.mjs --check` |
| 61 | blocking | 1.4s | 0 | `node scripts/build-proposed-edges.mjs --check` |
| 75 | blocking | 1.4s | 0 | `node scripts/build-intelligence-suite.mjs --self-test` |

## Failures

- Step 88 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
