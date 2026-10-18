# Proof Surface Diagnostics

Generated: 2026-10-18T18:02:25.684Z
Receipt: `cb8bff380f45ad95cc86b807` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 76.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 4.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 2.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 37 | blocking | 2.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 2.0s | 0 | `node scripts/check-content-coherence.mjs` |
| 55 | blocking | 1.7s | 0 | `node scripts/build-vault-momentum.mjs --check` |
| 92 | blocking | 1.7s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 11 | blocking | 1.6s | 0 | `node scripts/check-og-images.mjs` |
| 106 | advisory | 1.6s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 22 | blocking | 1.6s | 0 | `node scripts/check-schema-coverage.mjs` |
| 38 | blocking | 1.5s | 0 | `node scripts/generate-news-pages.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
