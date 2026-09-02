# Proof Surface Diagnostics

Generated: 2026-09-02T21:14:46.771Z
Receipt: `cc5b4cbc29fd9dbf10f04eda` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 37.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 86 | blocking | 1.4s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 90 | blocking | 1.2s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 85 | blocking | 1.1s | 0 | `node scripts/check-receipt-ordering.mjs --self-test` |
| 104 | advisory | 0.9s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 76 | blocking | 0.9s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 80 | blocking | 0.9s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 92 | advisory | 0.7s | 0 | `node scripts/check-dead-ctas.mjs --check` |
| 47 | blocking | 0.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 91 | advisory | 0.7s | 0 | `node scripts/check-mission-statement-coherence.mjs` |
| 95 | advisory | 0.7s | 0 | `node scripts/check-identity-coherence.mjs` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
