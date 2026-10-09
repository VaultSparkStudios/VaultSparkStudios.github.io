# Proof Surface Diagnostics

Generated: 2026-10-09T20:09:18.370Z
Receipt: `25a904e169ed64e612751763` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 10.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 0.5s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 0.4s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 0.3s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 0.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 0.2s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 35 | blocking | 0.2s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 0.2s | 0 | `node scripts/check-schema-coverage.mjs` |
| 7 | blocking | 0.2s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |
| 92 | blocking | 0.2s | 0 | `node scripts/generate-sitemap.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
