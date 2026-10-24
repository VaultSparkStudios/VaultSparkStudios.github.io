# Proof Surface Diagnostics

Generated: 2026-10-24T06:09:27.902Z
Receipt: `37036e34a1eef155f1aebd4d` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 55.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 106 | advisory | 2.3s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 49 | blocking | 1.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 37 | blocking | 1.5s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 1.5s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 65 | blocking | 1.4s | 0 | `node scripts/check-content-coherence.mjs` |
| 35 | blocking | 1.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 88 | blocking | 1.1s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 22 | blocking | 1.1s | 0 | `node scripts/check-schema-coverage.mjs` |
| 18 | blocking | 1.1s | 0 | `node scripts/check-videogame-schema.mjs` |
| 92 | blocking | 1.0s | 0 | `node scripts/generate-sitemap.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
