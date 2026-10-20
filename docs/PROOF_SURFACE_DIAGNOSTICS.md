# Proof Surface Diagnostics

Generated: 2026-10-20T07:15:05.090Z
Receipt: `3f05a34cb1d2ef511dec8e3f` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 46.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 1.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 37 | blocking | 1.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 106 | advisory | 1.1s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 65 | blocking | 1.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 78 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 38 | blocking | 1.1s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 18 | blocking | 1.0s | 0 | `node scripts/check-videogame-schema.mjs` |
| 35 | blocking | 1.0s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 0.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 34 | blocking | 0.9s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs --self-test` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
