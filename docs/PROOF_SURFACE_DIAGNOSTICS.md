# Proof Surface Diagnostics

Generated: 2026-10-17T00:14:27.451Z
Receipt: `9fe65e511fcc3c0754445f44` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 78.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 92 | blocking | 17.1s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 88 | blocking | 5.9s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 87 | blocking | 4.2s | 0 | `node scripts/check-receipt-ordering.mjs --self-test` |
| 78 | blocking | 2.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 90 | blocking | 1.8s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 91 | blocking | 1.4s | 0 | `node scripts/generate-sitemap.mjs --self-test` |
| 102 | advisory | 1.3s | 0 | `node scripts/build-hero-portfolio.mjs --check` |
| 106 | advisory | 1.3s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 35 | blocking | 1.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 93 | advisory | 1.2s | 0 | `node scripts/check-mission-statement-coherence.mjs` |

## Failures

- Step 96 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
